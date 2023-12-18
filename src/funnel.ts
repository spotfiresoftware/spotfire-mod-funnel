// @ts-ignore
import { line } from "d3";

import {
    rectangularSelection,
    contrastToLabelColor,
    luminance
} from "./runtime/index";
import {
    VerticalLayout,
    createHorizontalLayout,
    createVerticalLayout,
    labels,
    labelsHeightInSlice,
    values
} from "./funnelLayout";

export interface Settings {
    svg: d3.Selection<SVGSVGElement, any, HTMLElement, any>;
    clearMarking?(): void;
    mouseLeave?(): void;
    animationSpeed?: number;
    size?: { width: number; height: number };
    showMinMax?: boolean;
    showDepth: boolean;
    depth: number;
    rounded: boolean;
    angle: number;
    distance: number;
    renderValues: "all" | "marked" | "none";
    renderLabels: "all" | "marked" | "none";
    valuesPosition: "inside";
    labelPosition: "right" | "inside";
    style: {
        label: {
            size: number;
            weight: string;
            style: string;
            color: string;
            fontFamily: string;
        };
        value: {
            size: number;
            weight: string;
            style: string;
            color: string;
            fontFamily: string;
        };
        marking: { color: string };
        background: { color: string };
    };
}

export interface FunnelSlice {
    mark(ctrlKey: boolean): void;
    mouseOver?(): void;
    label: string;
    key: string;
    percent: number;
    isMarked: boolean;
    startValue: number;
    endValue: number;
    formattedValue: string;
    color: string;
}

export async function render(slices: FunnelSlice[], settings: Settings) {
    const { animationSpeed = 0 } = settings;
    const { size = { width: 50, height: 50 } } = settings;
    settings.svg.attr("width", size.width).attr("height", size.height);

    const verticalLayout = createVerticalLayout(size.height, slices.length, {
        showDepth: settings.showDepth,
        distance: settings.distance,
        depth: settings.depth,
        labelsHeight: labelsHeightInSlice(settings)
    });

    const horizontalLayout = createHorizontalLayout(
        size,
        slices,
        settings.renderLabels && settings.labelPosition == "right"
            ? settings.style.label.size
            : 0
    );

    let elements = settings.svg
        .selectAll<any, FunnelSlice>("g.element")
        .data(slices, (d: FunnelSlice) => d.key);

    let newElements = elements
        .enter()
        .append("g")
        .attr("class", "element")
        .attr(
            "transform",
            (d, i) =>
                `translate(${horizontalLayout.horizontalTranslate(
                    d
                )}, ${verticalLayout.verticalTranslate(i)})`
        );

    createGroupElements(newElements);

    let update = elements
        .merge(newElements)
        .sort((a, b) => a.startValue - b.startValue)
        .on("click", function (event: MouseEvent, d) {
            event.stopPropagation();
            d.mark(event.ctrlKey);
        })
        .on("mouseleave", (e, d) => {
            settings.mouseLeave?.();
        })
        .on("mouseenter", (e, d) => {
            d.mouseOver?.();
        });

    update
        .transition("Position elements")
        .duration(animationSpeed)
        .attr(
            "transform",
            (d, i) =>
                `translate(${horizontalLayout.horizontalTranslate(
                    d
                )}, ${verticalLayout.verticalTranslate(i)})`
        );

    updateElements(
        update,
        settings,
        horizontalLayout.width,
        horizontalLayout.rightPadding,
        verticalLayout
    );

    elements
        .exit()
        .transition("add sectors")
        .duration(animationSpeed / 2)
        .style("opacity", 0)
        .remove();

    rectangularSelection(settings.svg as any, {
        centerMarking: true,
        classesToMark: "funnel-slice",
        ignoredClickClasses: ["element"],
        clearMarking: () => settings.clearMarking?.(),
        mark(data: FunnelSlice, ctrlKey) {
            data.mark(ctrlKey);
        }
    });
}

function createGroupElements(
    elementGroup: d3.Selection<SVGGElement, FunnelSlice, SVGSVGElement, any>
) {
    elementGroup.append("path").attr("class", "funnel-depth");
    elementGroup.append("path").attr("class", "funnel-slice");
    elementGroup.append("ellipse").attr("class", "ellipse-top");
    elementGroup.append("ellipse").attr("class", "ellipse-bottom");
    elementGroup.append("text").attr("class", "label-value");
    elementGroup.append("text").attr("class", "label");
    elementGroup.append("circle").attr("class", "dot");
}

function updateElements(
    update: d3.Selection<any, FunnelSlice, SVGSVGElement, any>,
    settings: Settings,
    width: number,
    rightPadding: number,
    verticalLayout: VerticalLayout
) {
    const { animationSpeed = 0 } = settings;

    const labelColorLuminance = luminance(
        parseInt(settings.style.label.color.substr(1, 2), 16),
        parseInt(settings.style.label.color.substr(3, 2), 16),
        parseInt(settings.style.label.color.substr(5, 2), 16)
    );

    var trapezoid = line()
        .x(function (d) {
            return d[0];
        })
        .y(function (d) {
            return d[1];
        });

    let height = verticalLayout.sliceHeight;

    let renderRectangularBox = verticalLayout.showDepth && !settings.rounded;
    let renderRounded = verticalLayout.showDepth && settings.rounded;

    let distance = Math.min(height / 5, settings.distance);
    let shadowHeight = Math.min(height / 3, settings.depth);
    let boxShadowHeight = Math.min(shadowHeight, distance);

    let startHeight = verticalLayout.showDepth ? distance : 0;

    let labelStartHeight = verticalLayout.showDepth
        ? renderRectangularBox
            ? distance
            : distance + shadowHeight
        : 0;
    // The ellipsis grows beneath the funnel slice, which means the text looks misaligned unless it is shifted down in relation to the shadow height.
    let labelSliceHeight = verticalLayout.showDepth
        ? renderRectangularBox
            ? height - startHeight
            : height + shadowHeight / 2 - labelStartHeight
        : height;

    let labelRenderer = labels(
        settings,
        width,
        rightPadding,
        labelStartHeight,
        labelSliceHeight
    );
    let valueRenderer = values(
        settings,
        width,
        labelStartHeight,
        labelSliceHeight,
        labelRenderer
    );

    update
        .select(".dot")
        .attr("cy", labelStartHeight)
        .attr("cx", d => (width * d.startValue) / 2)
        .attr("r", 2)
        .attr("display", "none")
        .attr("fill", d => "red");

    update
        .select("path.funnel-slice")
        .transition("add sectors")
        .attr("d", d => {
            return (
                trapezoid([
                    [0, startHeight],
                    [d.startValue * width, startHeight],
                    [
                        ((d.startValue - d.endValue) * width) / 2 +
                            d.endValue * width,
                        height
                    ],
                    [((d.startValue - d.endValue) * width) / 2, height]
                ]) + "Z"
            );
        })
        .duration(animationSpeed)
        .attr("fill", d => d.color);

    update
        .select("path.funnel-depth")
        .transition("add sectors")
        .attr("opacity", "0.7")
        .attr("display", renderRectangularBox ? "inherit" : "none")
        .attr("d", d => {
            const maxWith = d.startValue * width;
            return (
                trapezoid([
                    [
                        Math.min(settings.angle, maxWith / 2),
                        distance - boxShadowHeight
                    ],
                    [
                        Math.max(
                            d.startValue * width - settings.angle,
                            maxWith / 2
                        ),
                        distance - boxShadowHeight
                    ],
                    [maxWith, startHeight],
                    [0, startHeight]
                ]) + "Z"
            );
        })
        .duration(animationSpeed)
        .attr("fill", d => d.color);

    update
        .select("ellipse.ellipse-top")
        .transition("add sectors")
        .attr("opacity", "1")
        .attr("display", renderRounded ? "inherit" : "none")
        .duration(animationSpeed)
        .attr("cx", d => (d.startValue * width) / 2)
        .attr("cy", startHeight)
        .attr("ry", shadowHeight)
        .attr("rx", d => (width * d.startValue) / 2)
        .attr("style", "filter: brightness(50%);")
        .attr("fill", d => settings.style.background.color)
        .attr("fill", d => d.color);

    update
        .select("ellipse.ellipse-bottom")
        .transition("add sectors")
        .attr("opacity", "1")
        .attr("display", renderRounded ? "inherit" : "none")
        .duration(animationSpeed)
        .attr("cx", d => (d.startValue * width) / 2)
        .attr("cy", height)
        .attr("ry", shadowHeight)
        .attr("rx", d => (width * d.endValue) / 2)
        .attr("fill", d => d.color);

    update
        .select("text.label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(animationSpeed)
        .attr("font-size", settings.style.label.size)
        .style("display", labelRenderer.textLabelDisplay)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", d =>
            settings.labelPosition == "inside"
                ? getTextColor(d.color)
                : settings.style.label.color
        )
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", d =>
            settings.labelPosition == "inside" ? "middle" : "start"
        )
        .attr("y", labelRenderer.y)
        .attr("x", labelRenderer.x)
        .text(labelRenderer.text);

    update
        .select("text.label-value")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(animationSpeed)
        .attr("font-size", settings.style.value.size)
        .style("display", valueRenderer.textLabelDisplay)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", d =>
            settings.valuesPosition == "inside"
                ? getTextColor(d.color)
                : settings.style.label.color
        )
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", valueRenderer.y)
        .attr("x", valueRenderer.x)
        .text(valueRenderer.text);

    function getTextColor(fillColor: string) {
        if (settings.style.background.color == "transparent") {
            return settings.style.label.color;
        }
        return contrastToLabelColor(fillColor, labelColorLuminance) > 1.7
            ? settings.style.label.color
            : settings.style.background.color;
    }
}
