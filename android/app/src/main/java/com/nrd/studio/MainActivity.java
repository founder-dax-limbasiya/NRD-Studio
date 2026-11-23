package com.nrd.studio;

import android.app.Activity;

import androidx.annotation.OptIn;
import androidx.media3.common.util.UnstableApi;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.VideoView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@OptIn(markerClass = UnstableApi.class)
public final class MainActivity extends Activity {
    private static final int REQUEST_PICK_IMAGES = 2101;
    private static final int REQUEST_SAVE_VIDEO = 2102;
    private static final String PREFS = "nrd-native-workspace";
    private static final String SCENES_KEY = "image-scenes";

    private final ArrayList<SceneDraft> scenes = new ArrayList<>();
    private final AndroidImageSequenceRenderer renderer = new AndroidImageSequenceRenderer();

    private LinearLayout sceneList;
    private TextView sceneCount;
    private TextView statusText;
    private ProgressBar progressBar;
    private Spinner aspectSpinner;
    private Spinner fpsSpinner;
    private EditText projectName;
    private Button addImagesButton;
    private Button renderButton;
    private Button cancelButton;
    private Button saveButton;
    private VideoView preview;
    private File renderedFile;
    private boolean isCopying;

    private static final int BG = Color.rgb(16, 17, 20);
    private static final int PANEL = Color.rgb(25, 27, 33);
    private static final int PANEL_ALT = Color.rgb(18, 20, 24);
    private static final int TEXT = Color.rgb(241, 243, 246);
    private static final int MUTED = Color.rgb(151, 156, 166);
    private static final int ACCENT = Color.rgb(217, 243, 106);
    private static final int BORDER = Color.rgb(48, 52, 60);

    private static final class SceneDraft {
        final Uri uri;
        final String name;
        int durationSeconds;

        SceneDraft(Uri uri, String name, int durationSeconds) {
            this.uri = uri;
            this.name = name;
            this.durationSeconds = durationSeconds;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(BG);
        window.setNavigationBarColor(BG);
        window.getDecorView().setSystemUiVisibility(0);
        restoreScenes();
        buildUi();
        renderSceneList();
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(20), dp(24), dp(20), dp(32));
        scroll.addView(page, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        LinearLayout brandRow = new LinearLayout(this);
        brandRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView mark = text("N", 22, BG, true);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(rounded(ACCENT, ACCENT, 12));
        brandRow.addView(mark, new LinearLayout.LayoutParams(dp(40), dp(40)));
        LinearLayout brandText = new LinearLayout(this);
        brandText.setOrientation(LinearLayout.VERTICAL);
        brandText.setPadding(dp(11), 0, 0, 0);
        brandText.addView(text("NRD STUDIO", 14, TEXT, true));
        brandText.addView(text("NOTREALDAKSH  ·  ANDROID", 8, MUTED, true));
        brandRow.addView(brandText, new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1
        ));
        page.addView(brandRow);
        addSpace(page, 26);

        page.addView(text("Images in. Videos out.", 29, TEXT, true));
        TextView intro = text(
                "Build a video from your own images. Choose the order, set each scene duration and render an MP4 locally on this phone.",
                12, MUTED, false
        );
        intro.setLineSpacing(dp(3), 1f);
        page.addView(intro);
        addSpace(page, 22);

        LinearLayout projectCard = card(page);
        projectCard.addView(label("PROJECT NAME"));
        projectName = input("Give your video a name", InputType.TYPE_CLASS_TEXT);
        projectCard.addView(projectName);
        addSpace(projectCard, 8);
        projectCard.addView(label("OUTPUT SHAPE"));
        aspectSpinner = spinner(new String[]{"Vertical · 9:16", "Landscape · 16:9", "Square · 1:1"});
        projectCard.addView(aspectSpinner);
        addSpace(projectCard, 12);
        projectCard.addView(label("FRAME RATE"));
        fpsSpinner = spinner(new String[]{"24 FPS", "30 FPS"});
        page.addView(projectCard);
        projectCard.addView(fpsSpinner);
        addSpace(page, 16);

        TextView sectionTitle = text("Your scenes", 18, TEXT, true);
        page.addView(sectionTitle);
        TextView sectionHint = text("Add image files, then move them into the order you want.", 10, MUTED, false);
        page.addView(sectionHint);
        sceneCount = text("0 scenes", 10, MUTED, true);
        page.addView(sceneCount);
        addSpace(page, 10);

        sceneList = new LinearLayout(this);
        sceneList.setOrientation(LinearLayout.VERTICAL);
        page.addView(sceneList);

        addImagesButton = button("＋  Add images", true);
        addImagesButton.setOnClickListener(view -> chooseImages());
        page.addView(addImagesButton);
        addSpace(page, 23);

        page.addView(text("Export settings", 16, TEXT, true));
        TextView exportHint = text("The first native renderer creates a silent MP4 slideshow. Audio and animated transitions come later.", 10, MUTED, false);
        exportHint.setLineSpacing(dp(3), 1f);
        page.addView(exportHint);
        addSpace(page, 12);

        renderButton = button("Render MP4", true);
        renderButton.setOnClickListener(view -> startRender());
        page.addView(renderButton);

        cancelButton = button("Cancel render", false);
        cancelButton.setVisibility(View.GONE);
        cancelButton.setOnClickListener(view -> renderer.cancel());
        page.addView(cancelButton);
        addSpace(page, 12);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.GONE);
        page.addView(progressBar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(7)
        ));
        statusText = text("Projects and selected images stay on this device.", 10, MUTED, false);
        page.addView(statusText);
        addSpace(page, 12);

        preview = new VideoView(this);
        preview.setVisibility(View.GONE);
        page.addView(preview, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(230)
        ));

        saveButton = button("Save MP4 to device", true);
        saveButton.setVisibility(View.GONE);
        saveButton.setOnClickListener(view -> saveVideoToDevice());
        page.addView(saveButton);
        addSpace(page, 18);

        TextView note = text(
                "Local processing · No paid API · Images are not uploaded to a server. Rendering speed depends on your phone. Keep NRD open during export.",
                9, MUTED, false
        );
        note.setLineSpacing(dp(3), 1f);
        page.addView(note);

        setContentView(scroll);
    }

    private LinearLayout card(LinearLayout parent) {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16), dp(16), dp(16), dp(16));
        panel.setBackground(rounded(PANEL, BORDER, 16));
        parent.addView(panel, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        return panel;
    }

    private TextView label(String value) {
        TextView view = text(value, 9, MUTED, true);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.bottomMargin = dp(7);
        view.setLayoutParams(params);
        return view;
    }

    private EditText input(String hint, int inputType) {
        EditText field = new EditText(this);
        field.setSingleLine(true);
        field.setTextColor(TEXT);
        field.setHintTextColor(MUTED);
        field.setTextSize(13);
        field.setHint(hint);
        field.setInputType(inputType);
        field.setPadding(dp(12), dp(10), dp(12), dp(10));
        field.setBackground(rounded(PANEL_ALT, BORDER, 10));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48)
        );
        params.bottomMargin = dp(12);
        field.setLayoutParams(params);
        return field;
    }

    private Spinner spinner(String[] options) {
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(
                this, android.R.layout.simple_spinner_item, options
        ) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                TextView view = (TextView) super.getView(position, convertView, parent);
                view.setTextColor(TEXT);
                view.setTextSize(12);
                return view;
            }

            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                TextView view = (TextView) super.getDropDownView(position, convertView, parent);
                view.setTextColor(TEXT);
                view.setTextSize(12);
                view.setBackgroundColor(PANEL);
                view.setPadding(dp(12), dp(12), dp(12), dp(12));
                return view;
            }
        };
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        Spinner result = new Spinner(this);
        result.setAdapter(adapter);
        result.setPadding(dp(8), dp(3), dp(8), dp(3));
        result.setBackground(rounded(PANEL_ALT, BORDER, 10));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(44)
        );
        params.bottomMargin = dp(6);
        result.setLayoutParams(params);
        return result;
    }

    private Button button(String title, boolean primary) {
        Button button = new Button(this);
        button.setText(title);
        button.setTextSize(12);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setAllCaps(false);
        button.setTextColor(primary ? BG : TEXT);
        button.setPadding(dp(14), dp(10), dp(14), dp(10));
        button.setBackground(rounded(primary ? ACCENT : PANEL, primary ? ACCENT : BORDER, 12));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48)
        );
        params.bottomMargin = dp(8);
        button.setLayoutParams(params);
        return button;
    }

    private TextView text(String value, float size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private GradientDrawable rounded(int color, int stroke, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radius));
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private void addSpace(LinearLayout parent, int heightDp) {
        View spacer = new View(this);
        parent.addView(spacer, new LinearLayout.LayoutParams(1, dp(heightDp)));
    }

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void chooseImages() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("image/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent, REQUEST_PICK_IMAGES);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null) {
            return;
        }
        if (requestCode == REQUEST_PICK_IMAGES) {
            addPickedImages(data);
        } else if (requestCode == REQUEST_SAVE_VIDEO && data.getData() != null) {
            copyRenderedFile(data.getData());
        }
    }

    private void addPickedImages(Intent data) {
        int before = scenes.size();
        if (data.getClipData() != null) {
            for (int index = 0; index < data.getClipData().getItemCount(); index++) {
                addImageUri(data.getClipData().getItemAt(index).getUri(), data);
            }
        } else if (data.getData() != null) {
            addImageUri(data.getData(), data);
        }
        persistScenes();
        renderSceneList();
        int added = scenes.size() - before;
        if (added > 0) {
            statusText.setText(added + " image" + (added == 1 ? "" : "s") + " added. Set durations and render when ready.");
        }
    }

    private void addImageUri(Uri uri, Intent sourceIntent) {
        if (uri == null || scenes.size() >= 100) {
            return;
        }
        for (SceneDraft item : scenes) {
            if (item.uri.equals(uri)) {
                return;
            }
        }
        try {
            int flags = sourceIntent.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION;
            if (flags != 0) {
                getContentResolver().takePersistableUriPermission(uri, flags);
            }
        } catch (SecurityException ignored) {
            // The picker can provide a temporary read grant even when persistable access is unavailable.
        }
        scenes.add(new SceneDraft(uri, displayName(uri), 3));
    }

    private String displayName(Uri uri) {
        String name = "Image";
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(uri, null, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (column >= 0) {
                    String value = cursor.getString(column);
                    if (value != null && !value.trim().isEmpty()) {
                        name = value;
                    }
                }
            }
        } catch (RuntimeException ignored) {
            // Use the generic label for document providers without metadata access.
        } finally {
            if (cursor != null) cursor.close();
        }
        return name;
    }

    private void renderSceneList() {
        sceneList.removeAllViews();
        sceneCount.setText(scenes.size() + (scenes.size() == 1 ? " scene" : " scenes"));
        if (scenes.isEmpty()) {
            TextView empty = text("No images yet. Tap Add images to choose pictures from your phone.", 11, MUTED, false);
            empty.setPadding(dp(14), dp(18), dp(14), dp(18));
            empty.setBackground(rounded(PANEL, BORDER, 12));
            sceneList.addView(empty);
            return;
        }

        for (int index = 0; index < scenes.size(); index++) {
            final int sceneIndex = index;
            final SceneDraft scene = scenes.get(index);
            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            item.setPadding(dp(12), dp(12), dp(12), dp(12));
            item.setBackground(rounded(PANEL, BORDER, 12));

            LinearLayout heading = new LinearLayout(this);
            heading.setGravity(Gravity.CENTER_VERTICAL);
            TextView name = text(String.format(Locale.getDefault(), "%02d  %s", index + 1, scene.name), 11, TEXT, true);
            name.setMaxLines(2);
            heading.addView(name, new LinearLayout.LayoutParams(
                    0, ViewGroup.LayoutParams.WRAP_CONTENT, 1
            ));

            Button up = miniButton("↑");
            up.setEnabled(index > 0);
            up.setOnClickListener(view -> moveScene(sceneIndex, -1));
            heading.addView(up, new LinearLayout.LayoutParams(dp(40), dp(38)));
            Button down = miniButton("↓");
            down.setEnabled(index < scenes.size() - 1);
            down.setOnClickListener(view -> moveScene(sceneIndex, 1));
            heading.addView(down, new LinearLayout.LayoutParams(dp(40), dp(38)));
            item.addView(heading);

            LinearLayout durationRow = new LinearLayout(this);
            durationRow.setGravity(Gravity.CENTER_VERTICAL);
            TextView durationLabel = text("Duration · seconds", 9, MUTED, true);
            durationRow.addView(durationLabel, new LinearLayout.LayoutParams(
                    0, ViewGroup.LayoutParams.WRAP_CONTENT, 1
            ));
            EditText duration = new EditText(this);
            duration.setSingleLine(true);
            duration.setText(String.valueOf(scene.durationSeconds));
            duration.setTextSize(12);
            duration.setTextColor(TEXT);
            duration.setInputType(InputType.TYPE_CLASS_NUMBER);
            duration.setGravity(Gravity.CENTER);
            duration.setPadding(dp(6), dp(4), dp(6), dp(4));
            duration.setBackground(rounded(PANEL_ALT, BORDER, 8));
            durationRow.addView(duration, new LinearLayout.LayoutParams(dp(70), dp(40)));
            duration.addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                    try {
                        int value = Integer.parseInt(s.toString());
                        if (value >= 1 && value <= 120) {
                            scene.durationSeconds = value;
                            persistScenes();
                        }
                    } catch (NumberFormatException ignored) {
                        // Keep the last valid duration while the user edits.
                    }
                }
                @Override public void afterTextChanged(Editable s) {}
            });
            durationRow.addView(text("  max 120", 8, MUTED, false));
            item.addView(durationRow);
            Button remove = miniButton("Remove scene");
            remove.setTextColor(Color.rgb(235, 160, 165));
            remove.setOnClickListener(view -> {
                scenes.remove(sceneIndex);
                persistScenes();
                renderSceneList();
            });
            LinearLayout.LayoutParams removeParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, dp(34)
            );
            removeParams.topMargin = dp(6);
            item.addView(remove, removeParams);

            LinearLayout.LayoutParams itemParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            );
            itemParams.bottomMargin = dp(9);
            sceneList.addView(item, itemParams);
        }
    }

    private Button miniButton(String title) {
        Button button = new Button(this);
        button.setText(title);
        button.setTextSize(9);
        button.setTextColor(TEXT);
        button.setAllCaps(false);
        button.setPadding(dp(5), dp(2), dp(5), dp(2));
        button.setBackground(rounded(PANEL_ALT, BORDER, 8));
        return button;
    }

    private void moveScene(int index, int offset) {
        int next = index + offset;
        if (next < 0 || next >= scenes.size()) return;
        SceneDraft value = scenes.remove(index);
        scenes.add(next, value);
        persistScenes();
        renderSceneList();
    }

    private void startRender() {
        if (scenes.isEmpty()) {
            toast("Add at least one image first.");
            return;
        }
        long totalDuration = 0;
        List<AndroidImageSequenceRenderer.Scene> inputs = new ArrayList<>();
        for (SceneDraft scene : scenes) {
            if (!RenderPlan.isValidSceneDurationSeconds(scene.durationSeconds)) {
                toast("Each scene duration must be between 1 and 120 seconds.");
                return;
            }
            totalDuration += scene.durationSeconds;
            inputs.add(new AndroidImageSequenceRenderer.Scene(
                    scene.uri,
                    scene.durationSeconds * 1000L
            ));
        }
        if (totalDuration > RenderPlan.MAX_TOTAL_DURATION_SECONDS) {
            toast("Keep the first export under 10 minutes for stable phone performance.");
            return;
        }

        int[] dimensions = RenderPlan.dimensionsForAspectSelection(
                aspectSpinner.getSelectedItemPosition());
        int width = dimensions[0];
        int height = dimensions[1];
        int fps = fpsSpinner.getSelectedItemPosition() == 1 ? 30 : 24;
        String name = projectName.getText().toString().trim();
        if (name.isEmpty()) name = "NRD Video";
        String safeName = RenderPlan.safeFileName(name, "NRD-Video");

        File outputDir = new File(getCacheDir(), "nrd-exports");
        if (!outputDir.exists() && !outputDir.mkdirs()) {
            toast("Could not create the temporary export folder.");
            return;
        }
        File output = new File(outputDir, safeName + "-" + System.currentTimeMillis() + ".mp4");

        if (renderedFile != null && renderedFile.exists()) {
            // The previous preview is no longer needed once a new render starts.
            //noinspection ResultOfMethodCallIgnored
            renderedFile.delete();
        }
        renderedFile = null;
        preview.setVisibility(View.GONE);
        saveButton.setVisibility(View.GONE);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.VISIBLE);
        renderButton.setEnabled(false);
        cancelButton.setVisibility(View.VISIBLE);
        addImagesButton.setEnabled(false);
        statusText.setText("Preparing images for MP4 export…");

        try {
            renderer.export(
                    this,
                    inputs,
                    width,
                    height,
                    fps,
                    output,
                    new AndroidImageSequenceRenderer.Callback() {
                        @Override
                        public void onProgress(int percent) {
                            progressBar.setProgress(percent);
                            statusText.setText("Rendering on this phone · " + percent + "%");
                        }

                        @Override
                        public void onCompleted(File outputFile) {
                            progressBar.setProgress(100);
                            progressBar.setVisibility(View.GONE);
                            renderButton.setEnabled(true);
                            cancelButton.setVisibility(View.GONE);
                            addImagesButton.setEnabled(true);
                            renderedFile = outputFile;
                            saveButton.setVisibility(View.VISIBLE);
                            statusText.setText("MP4 ready · " + formatMegabytes(outputFile.length()) + " MB · Save it to your device.");
                            preview.setVideoURI(Uri.fromFile(outputFile));
                            preview.setVisibility(View.VISIBLE);
                            preview.start();
                        }

                        @Override
                        public void onError(String message, boolean cancelled) {
                            progressBar.setVisibility(View.GONE);
                            renderButton.setEnabled(true);
                            cancelButton.setVisibility(View.GONE);
                            addImagesButton.setEnabled(true);
                            statusText.setText(cancelled ? "Export cancelled." : "Export could not finish.");
                            if (!cancelled && message != null) toast(message);
                        }
                    }
            );
        } catch (RuntimeException exception) {
            progressBar.setVisibility(View.GONE);
            renderButton.setEnabled(true);
            cancelButton.setVisibility(View.GONE);
            addImagesButton.setEnabled(true);
            statusText.setText("Could not start the export.");
            toast(exception.getMessage() == null ? "Could not start the export." : exception.getMessage());
        }
    }

    private String formatMegabytes(long bytes) {
        return String.format(Locale.getDefault(), "%.1f", bytes / (1024.0 * 1024.0));
    }

    private void saveVideoToDevice() {
        if (renderedFile == null || !renderedFile.exists() || isCopying) {
            toast("Render a video before saving.");
            return;
        }
        String name = projectName.getText().toString().trim();
        if (name.isEmpty()) name = "NRD-Video";
        String safeName = name.replaceAll("[^a-zA-Z0-9_-]+", "-").replaceAll("(^-+|-+$)", "");
        if (safeName.isEmpty()) safeName = "NRD-Video";

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("video/mp4");
        intent.putExtra(Intent.EXTRA_TITLE, safeName + ".mp4");
        startActivityForResult(intent, REQUEST_SAVE_VIDEO);
    }

    private void copyRenderedFile(Uri destination) {
        if (renderedFile == null || !renderedFile.exists()) {
            toast("The temporary video is no longer available. Render it again.");
            return;
        }
        isCopying = true;
        saveButton.setEnabled(false);
        statusText.setText("Saving MP4 to the selected folder…");
        File source = renderedFile;
        new Thread(() -> {
            String error = null;
            try (InputStream input = new FileInputStream(source);
                 OutputStream output = getContentResolver().openOutputStream(destination, "w")) {
                if (output == null) throw new IllegalStateException("The selected location could not be opened.");
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                }
                output.flush();
            } catch (Exception exception) {
                error = exception.getMessage() == null ? "Could not save the video." : exception.getMessage();
            }
            final String result = error;
            runOnUiThread(() -> {
                isCopying = false;
                saveButton.setEnabled(true);
                if (result == null) {
                    statusText.setText("MP4 saved successfully to your selected folder.");
                    toast("Video saved.");
                    // Keep the temporary copy available so the user can replay the preview.
                } else {
                    statusText.setText("The video could not be saved.");
                    toast(result);
                }
            });
        }).start();
    }

    private void restoreScenes() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String raw = prefs.getString(SCENES_KEY, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            for (int index = 0; index < array.length(); index++) {
                JSONObject object = array.getJSONObject(index);
                Uri uri = Uri.parse(object.getString("uri"));
                String name = object.optString("name", "Image");
                int duration = object.optInt("duration", 3);
                if (duration >= 1 && duration <= 120) {
                    scenes.add(new SceneDraft(uri, name, duration));
                }
            }
        } catch (Exception ignored) {
            scenes.clear();
        }
    }

    private void persistScenes() {
        JSONArray array = new JSONArray();
        for (SceneDraft scene : scenes) {
            JSONObject item = new JSONObject();
            try {
                item.put("uri", scene.uri.toString());
                item.put("name", scene.name);
                item.put("duration", scene.durationSeconds);
                array.put(item);
            } catch (Exception ignored) {
                // Skip malformed metadata while preserving the other scenes.
            }
        }
        getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(SCENES_KEY, array.toString())
                .apply();
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
