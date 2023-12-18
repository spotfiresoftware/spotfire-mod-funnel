import { describe, expect, test } from "vitest";
import { createVerticalLayout, calculateRightPadding } from "../src/funnelLayout";

describe("Vertical layout", () => {
    test("Uses the padding to reduce the height", () => {
        const layout = createVerticalLayout(100, 1, {
            showDepth: false
        });

        expect(layout.height).toBe(80);
        expect(layout.sliceHeight).toBe(80);
        expect(layout.showDepth).toBe(false);
    });

    test("splits the slice height evenly", () => {
        const layout = createVerticalLayout(100, 8, {
            showDepth: false
        });

        expect(layout.height).toBe(80);
        expect(layout.sliceHeight).toBe(10);
    });

    test("Disables depth when slices become small", () => {
        const layout = createVerticalLayout(100, 8, {
            showDepth: true,
            depth: 20
        });

        expect(layout.height).toBe(80);
        expect(layout.sliceHeight).toBe(10);
        expect(layout.showDepth).toBe(false);
    });

    test("Adds depth to padding", () => {
        const layout = createVerticalLayout(100, 2, {
            showDepth: true,
            distance: 10,
            depth: 10
        });

        expect(layout.height).toBe(80);
        expect(layout.sliceHeight).toBe(40);
        expect(layout.showDepth).toBe(true);
    });
    
    test("Adds disable depth when label is too large", () => {
        const layout = createVerticalLayout(100, 3, {
            showDepth: true,
            distance: 10,
            depth: 10,
            labelsHeight: 25
        });

        expect(layout.height).toBe(80);
        expect(layout.showDepth).toBe(false);
    });

    test("Adds vertical translate", () => {
        const layout = createVerticalLayout(100, 2, {
            showDepth: true,
            distance: 10,
            depth: 10
        });

        expect(layout.height).toBe(80);
        expect(layout.sliceHeight).toBe(40);
        expect(layout.verticalTranslate(0)).toBe(50);
        expect(layout.verticalTranslate(1)).toBe(10);
    });
});

// describe("Horizontal layout", () => {
//     test("uses height instead of width when width is greater", () => {
//     });
// });

describe("Right padding", () => {
    test("works", () => {
        let padding = calculateRightPadding(200, 10, []);
        expect(padding).toBe(0);
    });

    test("works", () => {
        let padding = calculateRightPadding(300, 10, [
            {
                label: "",
                startValue: 1
            },
            {
                label: "hello",
                startValue: 0.6
            }
        ]);
        expect(padding).toBe(0);
    });
});
