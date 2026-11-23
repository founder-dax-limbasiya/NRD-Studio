package com.nrd.studio;

import org.junit.Test;

import static org.junit.Assert.*;

public class RenderPlanTest {
    @Test
    public void acceptsSceneDurationBoundaries() {
        assertTrue(RenderPlan.isValidSceneDurationSeconds(1));
        assertTrue(RenderPlan.isValidSceneDurationSeconds(120));
        assertFalse(RenderPlan.isValidSceneDurationSeconds(0));
        assertFalse(RenderPlan.isValidSceneDurationSeconds(121));
        assertTrue(RenderPlan.isValidSceneDurationMs(1_000L));
        assertTrue(RenderPlan.isValidSceneDurationMs(120_000L));
        assertFalse(RenderPlan.isValidSceneDurationMs(999L));
        assertFalse(RenderPlan.isValidSceneDurationMs(120_001L));
    }

    @Test
    public void validatesSceneCountAndTotalDuration() {
        assertNull(RenderPlan.validateExport(1, 1_000L, 720, 1280, 24));
        assertNull(RenderPlan.validateExport(100, 600_000L, 720, 1280, 30));
        assertNotNull(RenderPlan.validateExport(0, 1_000L, 720, 1280, 24));
        assertNotNull(RenderPlan.validateExport(101, 1_000L, 720, 1280, 24));
        assertNotNull(RenderPlan.validateExport(1, 0L, 720, 1280, 24));
        assertNotNull(RenderPlan.validateExport(1, 600_001L, 720, 1280, 24));
    }

    @Test
    public void validatesOutputDimensionsAndFrameRate() {
        assertNull(RenderPlan.validateExport(1, 3_000L, 720, 1280, 24));
        assertNull(RenderPlan.validateExport(1, 3_000L, 1280, 720, 30));
        assertNotNull(RenderPlan.validateExport(1, 3_000L, 0, 1280, 24));
        assertNotNull(RenderPlan.validateExport(1, 3_000L, 4096, 1280, 24));
        assertNotNull(RenderPlan.validateExport(1, 3_000L, 720, 1280, 25));
    }

    @Test
    public void mapsAspectSelectionsToExpectedSizes() {
        assertArrayEquals(new int[]{720, 1280}, RenderPlan.dimensionsForAspectSelection(0));
        assertArrayEquals(new int[]{1280, 720}, RenderPlan.dimensionsForAspectSelection(1));
        assertArrayEquals(new int[]{720, 720}, RenderPlan.dimensionsForAspectSelection(2));
        assertArrayEquals(new int[]{720, 1280}, RenderPlan.dimensionsForAspectSelection(-1));
    }

    @Test
    public void sanitizesOutputFileNames() {
        assertEquals("My-Video_01", RenderPlan.safeFileName("  My Video_01  ", "NRD"));
        assertEquals("NRD-Video", RenderPlan.safeFileName("***", "NRD Video"));
        assertEquals("NRD-Video", RenderPlan.safeFileName(null, null));
    }
}
