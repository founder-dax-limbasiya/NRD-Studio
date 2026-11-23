package com.nrd.studio;

import android.content.Context;

import androidx.annotation.OptIn;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.Presentation;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.EditedMediaItemSequence;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.ProgressHolder;
import androidx.media3.transformer.Transformer;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Local image-sequence to MP4 exporter powered by AndroidX Media3 Transformer.
 *
 * This first native implementation creates a silent video sequence. Audio mixing,
 * transitions and background/resumable jobs are separate follow-up milestones.
 */
@OptIn(markerClass = UnstableApi.class)
public final class AndroidImageSequenceRenderer {
    public interface Callback {
        void onProgress(int percent);
        void onCompleted(File outputFile);
        void onError(String message, boolean cancelled);
    }

    public static final class Scene {
        public final Uri imageUri;
        public final long durationMs;

        public Scene(Uri imageUri, long durationMs) {
            if (imageUri == null) {
                throw new IllegalArgumentException("Scene image URI is required.");
            }
            if (durationMs < 1_000L || durationMs > 120_000L) {
                throw new IllegalArgumentException("Scene duration must be between 1 and 120 seconds.");
            }
            this.imageUri = imageUri;
            this.durationMs = durationMs;
        }
    }

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Transformer transformer;
    private Callback callback;
    private boolean running;
    private boolean cancelRequested;
    private Runnable progressTask;

    public boolean isRunning() {
        return running;
    }

    public void export(
            Context context,
            List<Scene> scenes,
            int outputWidth,
            int outputHeight,
            int frameRate,
            File outputFile,
            Callback callback) {

        if (running) {
            throw new IllegalStateException("An export is already running.");
        }
        if (scenes == null || scenes.isEmpty()) {
            throw new IllegalArgumentException("Add at least one image scene.");
        }
        if (outputWidth < 1 || outputHeight < 1) {
            throw new IllegalArgumentException("Output dimensions must be positive.");
        }
        if (frameRate != 24 && frameRate != 30) {
            throw new IllegalArgumentException("Choose 24 or 30 FPS.");
        }
        if (outputFile == null) {
            throw new IllegalArgumentException("An output file is required.");
        }

        long totalDurationMs = 0L;
        for (Scene scene : scenes) {
            if (scene == null || !RenderPlan.isValidSceneDurationMs(scene.durationMs)) {
                throw new IllegalArgumentException(
                        "Each scene duration must be between 1 and 120 seconds.");
            }
            totalDurationMs += scene.durationMs;
        }
        String validationError = RenderPlan.validateExport(
                scenes.size(), totalDurationMs, outputWidth, outputHeight, frameRate);
        if (validationError != null) {
            throw new IllegalArgumentException(validationError);
        }

        this.callback = callback;
        this.cancelRequested = false;

        File parent = outputFile.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IllegalStateException("Could not create the export folder.");
        }
        if (outputFile.exists() && !outputFile.delete()) {
            throw new IllegalStateException("Could not replace the previous output file.");
        }

        final List<EditedMediaItem> editedItems = new ArrayList<>();
        final Effect presentation = Presentation.createForWidthAndHeight(
                outputWidth,
                outputHeight,
                Presentation.LAYOUT_SCALE_TO_FIT
        );
        final Effects effects = new Effects(
                Collections.emptyList(),
                Collections.singletonList(presentation)
        );

        for (Scene scene : scenes) {
            MediaItem image = new MediaItem.Builder()
                    .setUri(scene.imageUri)
                    .setImageDurationMs(scene.durationMs)
                    .build();

            EditedMediaItem editedImage = new EditedMediaItem.Builder(image)
                    .setFrameRate(frameRate)
                    .setEffects(effects)
                    .build();
            editedItems.add(editedImage);
        }

        EditedMediaItemSequence videoSequence =
                EditedMediaItemSequence.withVideoFrom(editedItems);
        Composition composition = new Composition.Builder(videoSequence).build();

        transformer = new Transformer.Builder(context.getApplicationContext())
                .setVideoMimeType(MimeTypes.VIDEO_H264)
                .addListener(new Transformer.Listener() {
                    @Override
                    public void onCompleted(Composition completedComposition, ExportResult result) {
                        finishProgressPolling();
                        running = false;
                        if (callback != null) {
                            callback.onProgress(100);
                            callback.onCompleted(outputFile);
                        }
                    }

                    @Override
                    public void onError(
                            Composition failedComposition,
                            ExportResult result,
                            ExportException exception) {
                        finishProgressPolling();
                        running = false;
                        if (outputFile.exists()) {
                            // A failed or cancelled partial file is never presented as a finished video.
                            //noinspection ResultOfMethodCallIgnored
                            outputFile.delete();
                        }
                        if (callback != null) {
                            callback.onError(userFacingError(exception), cancelRequested);
                        }
                    }
                })
                .build();

        try {
            transformer.start(composition, outputFile.getAbsolutePath());
            running = true;
            beginProgressPolling();
        } catch (RuntimeException exception) {
            running = false;
            finishProgressPolling();
            if (outputFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                outputFile.delete();
            }
            throw exception;
        }
    }

    public void cancel() {
        if (!running || transformer == null) {
            return;
        }
        cancelRequested = true;
        transformer.cancel();
    }

    private void beginProgressPolling() {
        final ProgressHolder progressHolder = new ProgressHolder();
        progressTask = new Runnable() {
            @Override
            public void run() {
                if (!running || transformer == null) {
                    return;
                }
                try {
                    int state = transformer.getProgress(progressHolder);
                    if (state == Transformer.PROGRESS_STATE_AVAILABLE && callback != null) {
                        callback.onProgress(progressHolder.progress);
                    }
                } catch (IllegalStateException ignored) {
                    // The completion/error listener will close the progress loop.
                }
                if (running) {
                    mainHandler.postDelayed(this, 500L);
                }
            }
        };
        mainHandler.post(progressTask);
    }

    private String userFacingError(ExportException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SecurityException || cause instanceof FileNotFoundException) {
                return "NRD could not access one of the selected images. Remove it, add it again, and retry.";
            }
        }
        String message = exception.getMessage();
        return message == null || message.trim().isEmpty()
                ? "The phone could not finish this export."
                : message;
    }

    private void finishProgressPolling() {
        if (progressTask != null) {
            mainHandler.removeCallbacks(progressTask);
            progressTask = null;
        }
    }
}
