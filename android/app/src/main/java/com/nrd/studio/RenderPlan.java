package com.nrd.studio;

/** Pure validation and formatting rules shared by the Android UI and renderer. */
public final class RenderPlan {
    public static final int MAX_SCENES = 100;
    public static final int MAX_SCENE_DURATION_SECONDS = 120;
    public static final int MAX_TOTAL_DURATION_SECONDS = 600;
    public static final long MAX_TOTAL_DURATION_MS = MAX_TOTAL_DURATION_SECONDS * 1000L;
    private static final int MAX_OUTPUT_DIMENSION = 3840;

    private RenderPlan() {}

    public static boolean isValidSceneDurationSeconds(int seconds) {
        return seconds >= 1 && seconds <= MAX_SCENE_DURATION_SECONDS;
    }

    public static boolean isValidSceneDurationMs(long durationMs) {
        return durationMs >= 1_000L && durationMs <= MAX_SCENE_DURATION_SECONDS * 1000L;
    }

    /** Returns null for a valid export configuration, otherwise a user-readable reason. */
    public static String validateExport(
            int sceneCount, long totalDurationMs, int width, int height, int frameRate) {
        if (sceneCount < 1 || sceneCount > MAX_SCENES) {
            return "Add between 1 and 100 image scenes.";
        }
        if (totalDurationMs < 1_000L || totalDurationMs > MAX_TOTAL_DURATION_MS) {
            return "Keep the total export between 1 second and 10 minutes.";
        }
        if (width < 1 || height < 1
                || width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION) {
            return "Choose a supported output size up to 3840 pixels.";
        }
        if (frameRate != 24 && frameRate != 30) {
            return "Choose 24 or 30 FPS.";
        }
        return null;
    }

    /** Selection indexes used by the native UI: 0=vertical, 1=landscape, 2=square. */
    public static int[] dimensionsForAspectSelection(int selection) {
        switch (selection) {
            case 1:
                return new int[]{1280, 720};
            case 2:
                return new int[]{720, 720};
            default:
                return new int[]{720, 1280};
        }
    }

    public static String safeFileName(String requestedName, String fallback) {
        String safe = requestedName == null ? "" :
                requestedName.trim().replaceAll("[^a-zA-Z0-9_-]+", "-")
                        .replaceAll("(^-+|-+$)", "");
        if (!safe.isEmpty()) return safe;
        String safeFallback = fallback == null ? "" :
                fallback.trim().replaceAll("[^a-zA-Z0-9_-]+", "-")
                        .replaceAll("(^-+|-+$)", "");
        return safeFallback.isEmpty() ? "NRD-Video" : safeFallback;
    }
}
