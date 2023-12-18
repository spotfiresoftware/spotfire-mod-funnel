import { Spotfire, adjustedLabel, labelWidth } from "./runtime/index";
import { Settings, type FunnelSlice } from "./funnel";

const padding = 10;

interface VerticalLayoutSettings {
    labelsHeight?: number;
    showDepth?: boolean;
    distance?: number;
    depth?: number;
}

export type VerticalLayout = ReturnType<typeof createVerticalLayout>;

export function labelsHeightInSlice(settings: Settings) {
    let height = 0;
    if (settings.renderLabels != "none" && settings.labelPosition == "inside") {
        height += settings.style.label.size;
    }

    if (settings.renderValues != "none" && settings.valuesPosition == "inside") {
        height += settings.style.value.size;
    }

    return height;
}

export function createVerticalLayout(canvasHeight: number, sliceCount: number, _settings: VerticalLayoutSettings = {}) {
    let settings: Required<VerticalLayoutSettings> = {
        showDepth: false,
        depth: 0,
        distance: 0,
        labelsHeight: 11,
        ..._settings
    };

    let layout = verticalHeight(settings, canvasHeight, sliceCount);
    let depthThreshold = settings.labelsHeight + 2;

    if (layout.sliceHeight < depthThreshold) {
        settings.showDepth = false;
        layout = verticalHeight(settings, canvasHeight, sliceCount);
    }

    return {
        height: layout.height,
        sliceHeight: layout.sliceHeight,
        showDepth: settings.showDepth,
        verticalTranslate(i: number) {
            return layout.verticalPadding + layout.height - (i + 1) * layout.sliceHeight;
        }
    };
}

function verticalHeight(settings: Required<VerticalLayoutSettings>, canvasHeight: number, sliceCount: number) {
    const depthPadding = Math.max(Math.max(settings.depth, padding));
    const verticalPadding = settings.showDepth ? depthPadding : padding;

    const height = canvasHeight - verticalPadding * 2;
    const sliceHeight = height / sliceCount;
    return { sliceHeight, height, verticalPadding };
}

export function createHorizontalLayout(
    size: Spotfire.Size,
    slices: Pick<FunnelSlice, "label" | "startValue">[],
    labelSize: number
) {
    let width = Math.min(size.width, size.height) - padding * 2;

    let rightPadding = labelSize ? calculateRightPadding(width, labelSize, slices) : 0;

    if (labelSize) {
        width = Math.max(width - rightPadding, 100);
        rightPadding = size.width - width;
    }

    let leftPadding = 0;
    // Prevent the visualization from becoming wider than it is tall.
    if (size.width > size.height) {
        leftPadding = (size.width - size.height - padding) / 2;
    }

    let horizontalTranslate = (d: FunnelSlice) => {
        return leftPadding + width / 2 - (width / 2) * d.startValue;
    };

    return {
        width,
        rightPadding,
        horizontalTranslate
    };
}

export function calculateRightPadding(
    width: number,
    labelSize: number,
    slices: Pick<FunnelSlice, "label" | "startValue">[]
) {
    return slices.reduce((p, c) => {
        const lWidth = labelWidth(labelSize, c.label);
        let totalWidth = c.startValue * width + lWidth;

        if (totalWidth > width) {
            return lWidth > p ? lWidth : p;
        }

        return p;
    }, 0);
}

export function labels(
    settings: Settings,
    width: number,
    rightPadding: number,
    labelStartHeight: number,
    funnelSliceHeight: number
) {
    return {
        display: "none",
        text(d: FunnelSlice) {
            return settings.labelPosition == "right"
                ? rightSideLabel("label", width, rightPadding, settings.style.label.size)(d)
                : insideLabel("label", width, settings.style.label.size)(d);
        },
        textLabelDisplay(d: FunnelSlice): "none" | "inherit" {
            if (settings.renderLabels == "none") {
                return "none";
            }

            if (settings.renderLabels == "marked" && !d.isMarked) {
                return "none";
            }

            if (settings.labelPosition == "right") {
                return funnelSliceHeight > settings.style.label.size * 1.1 ? "inherit" : "none";
            }

            if (settings.valuesPosition == "inside" && settings.renderValues != "none") {
                return funnelSliceHeight > settings.style.label.size * 2.2 ? "inherit" : "none";
            }

            return funnelSliceHeight > settings.style.label.size * 1.2 ? "inherit" : "none";
        },
        x(d: FunnelSlice) {
            if (settings.labelPosition == "inside") {
                return (width * d.startValue) / 2;
            }

            return rightSideLabelPosition(d, width);
        },
        y(d: FunnelSlice) {
            if (
                settings.renderValues != "none" &&
                settings.valuesPosition == "inside" &&
                settings.labelPosition == "inside"
            ) {
                let space = (funnelSliceHeight - settings.style.label.size - settings.style.value.size) / 2;
                return labelStartHeight + Math.max(0, space);
            }

            return labelStartHeight + Math.max(0, (funnelSliceHeight - settings.style.label.size) / 2);
        }
    };
}

export function values(
    settings: Settings,
    width: number,
    labelStartHeight: number,
    funnelSliceHeight: number,
    labelRenderer: ReturnType<typeof labels>
) {
    return {
        display: "none",
        text(d: FunnelSlice) {
            return insideValue(width, settings.style.value.size)(d);
        },
        textLabelDisplay(d: FunnelSlice): "none" | "inherit" {
            if (settings.renderValues == "none") {
                return "none";
            }

            if (settings.renderValues == "marked" && !d.isMarked) {
                return "none";
            }

            return funnelSliceHeight > settings.style.value.size ? "inherit" : "none";
        },
        x(d: FunnelSlice) {
            return (width * d.startValue) / 2;
        },
        y(d: FunnelSlice) {
            if (settings.labelPosition == "inside" && labelRenderer.textLabelDisplay(d) != "none") {
                return labelRenderer.y(d) + settings.style.label.size;
            }

            return labelStartHeight + Math.max(0, (funnelSliceHeight - settings.style.value.size) / 2);
        }
    };
}

function insideValue(funnelWidth: number, fontSize: number) {
    return function (d: FunnelSlice) {
        let label = d.formattedValue;
        let width = d.endValue * funnelWidth;
        return adjustedLabel(label, width, fontSize);
    };
}

function rightSideLabel(p: keyof FunnelSlice, funnelWidth: number, padding: number, fontSize: number) {
    return function (d: FunnelSlice) {
        let label = ("" + d[p]) as string;
        let availableWidth = funnelWidth + padding - rightSideLabelPosition(d, funnelWidth);
        return adjustedLabel(label, availableWidth, fontSize);
    };
}

function insideLabel(p: keyof FunnelSlice, funnelWidth: number, fontSize: number) {
    return function (d: FunnelSlice) {
        let label = ("" + d[p]) as string;
        let width = (d.endValue + (d.startValue - d.endValue) / 3) * funnelWidth;
        return adjustedLabel(label, width, fontSize);
    };
}

function rightSideLabelPosition(d: FunnelSlice, width: number) {
    let maxWidth = width * d.startValue;
    let minWidth = width * d.endValue;
    return maxWidth - (maxWidth - minWidth) / 5 + 5;
}
