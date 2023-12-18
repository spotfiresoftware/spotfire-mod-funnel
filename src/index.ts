import { render, FunnelSlice } from "./funnel";
import { resources } from "./resources";
import { context, init, runtime, svg, renderSettings } from "./runtime/index";

const funnelAxisName = "Funnel";
const valueAxisName = "Value";

init(mod => {
    runtime(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis(valueAxisName),
        mod.property<boolean>("showDepth"),
        mod.property<number>("depth"),
        mod.property<number>("distance"),
        mod.property<string>("labels"),
        mod.property<number>("angle"),
        mod.property<string>("labelPosition"),
        mod.property<string>("renderValues"),
        mod.property<string>("valuePosition"),
        mod.property<boolean>("rounded"),
        mod.property<boolean>("showPercent")
    )(
        async (
            dataView,
            windowSize,
            valueAxis,
            showDepth,
            depth,
            distance,
            labels,
            angle,
            labelPosition,
            renderValues,
            valuePosition,
            rounded,
            showPercent
        ) => {
            if (!valueAxis.parts.length) {
                mod.controls.errorOverlay.show([
                    "Value axis needs an expression set."
                ]);
                context.signalRenderComplete();
                return;
            }

            mod.controls.errorOverlay.hide();

            let funnelRoot = await (
                await dataView.hierarchy(funnelAxisName)
            )?.root();
            let maxValue = funnelRoot!
                .rows()
                .reduce(
                    (p, r) =>
                        Math.max(p, r.continuous(valueAxisName).value() || 0),
                    0
                );

            let slices: FunnelSlice[] = funnelRoot!
                .rows()
                .sort((a, b) => {
                    const aVal =
                        a.continuous(valueAxisName).value<number>() ?? 0;
                    const bVal =
                        b.continuous(valueAxisName).value<number>() ?? 0;
                    if (aVal == bVal) {
                        return 0;
                    }

                    return aVal > bVal ? -1 : 1;
                })
                .map((row, i, rows) => {
                    let label: string;

                    label = row.categorical(funnelAxisName).formattedValue();

                    let startValuePercent =
                        (row.continuous(valueAxisName).value<number>() ?? 0) /
                        maxValue;
                    let endValuePercent = rows[i + 1]
                        ? (rows[i + 1]
                              .continuous(valueAxisName)
                              .value<number>() ?? 0) / maxValue
                        : startValuePercent;

                    const formattedValue = !!showPercent.value()
                        ? `${parseFloat(
                              (startValuePercent * 100).toPrecision(3)
                          )}%`
                        : valueAxis.parts.length
                        ? row.continuous(valueAxisName).formattedValue()
                        : 0;

                    return {
                        label,
                        formattedValue,
                        startValue: startValuePercent,
                        endValue: endValuePercent,
                        isMarked: row.isMarked(),
                        color: row.color().hexCode,
                        key: row.elementId(),
                        mark: (ctrlKey: boolean) => {
                            if (ctrlKey) {
                                row.mark("ToggleOrAdd");
                            } else {
                                row.mark();
                            }
                        },
                        mouseOver() {
                            mod.controls.tooltip.show(row);
                        }
                    } as FunnelSlice;
                })
                .reverse();

            render(slices, {
                svg,
                clearMarking() {
                    dataView.clearMarking();
                },
                mouseLeave() {
                    mod.controls.tooltip.hide();
                },
                size: windowSize,
                animationSpeed: context.interactive ? 250 : 0,
                showDepth: showDepth.value() ?? false,
                distance: distance.value() ?? 3,
                valuesPosition: valuePosition.value() ?? "inside",
                angle: angle.value() ?? 3,
                rounded: !!rounded.value(),
                labelPosition: labelPosition.value() ?? "inside",
                renderLabels: labels.value() ?? "all",
                renderValues: renderValues.value() ?? "all",
                depth: depth.value() ?? 5,
                style: {
                    marking: { color: context.styling.scales.font.color },
                    background: {
                        color: context.styling.general.backgroundColor
                    },
                    value: {
                        fontFamily: context.styling.general.font.fontFamily,
                        color: context.styling.general.font.color,
                        size: parseInt(
                            "" + context.styling.general.font.fontSize
                        ),
                        style: context.styling.general.font.fontStyle,
                        weight: context.styling.general.font.fontWeight
                    },
                    label: {
                        fontFamily: context.styling.scales.font.fontFamily,
                        color: context.styling.scales.font.color,
                        size: parseInt(
                            "" + context.styling.scales.font.fontSize
                        ),
                        style: context.styling.scales.font.fontStyle,
                        weight: context.styling.scales.font.fontWeight
                    }
                }
            });

            if (context.isEditing) {
                renderSettings(
                    [
                        {
                            label: resources.labels,
                            type: "radio",
                            property: labels,
                            values: [
                                { label: resources.labelsAll, value: "all" },
                                {
                                    label: resources.labelsMarked,
                                    value: "marked"
                                },
                                { label: resources.labelsNone, value: "none" }
                            ]
                        },
                        {
                            label: resources.labelPosition,
                            type: "radio",
                            property: labelPosition,
                            values: [
                                {
                                    label: resources.labelPositionRight,
                                    value: "right"
                                },
                                {
                                    label: resources.labelPositionInside,
                                    value: "inside"
                                }
                            ]
                        },
                        {
                            label: resources.renderValues,
                            type: "radio",
                            property: renderValues,
                            values: [
                                { label: resources.labelsAll, value: "all" },
                                {
                                    label: resources.labelsMarked,
                                    value: "marked"
                                },
                                { label: resources.labelsNone, value: "none" }
                            ]
                        },
                        // {
                        //     label: "Value position",
                        //     type: "radio",
                        //     property: valuePosition,
                        //     values: [
                        //         { label: "Left:", value: "left" },
                        //         { label: resources.labelPositionInside, value: "inside" }
                        //     ]
                        // },
                        {
                            label: resources.showPercent,
                            type: "checkbox",
                            property: showPercent
                        },

                        {
                            label: resources.showDepth,
                            type: "checkbox",
                            property: showDepth
                        },
                        ...(showDepth.value()
                            ? ([
                                  {
                                      label: resources.rounded,
                                      type: "checkbox",
                                      property: rounded
                                  },

                                  {
                                      label: resources.depth,
                                      type: "range",
                                      property: depth,
                                      max: 20,
                                      min: 0,
                                      step: 1
                                  },
                                  {
                                      label: resources.distance,
                                      type: "range",
                                      property: distance,
                                      max: 20,
                                      min: 0,
                                      step: 1
                                  },
                                  {
                                      label: resources.angle,
                                      type: "range",
                                      property: angle,
                                      max: 20,
                                      min: 0,
                                      step: 1
                                  }
                              ] as const)
                            : [])
                    ],
                    {
                        bg: context.styling.general.backgroundColor,
                        fontColor: context.styling.general.font.color
                    }
                );
            }
        }
    );
});
