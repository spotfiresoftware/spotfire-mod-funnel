import { select } from "d3";
import { ExtractValueType, OnLoadCallback, Readable, Reader } from "./spotfire";
import { interactionLock } from "./interactionLock";

export const svg = select("#mod-container")
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg");

export const Spotfire = window.Spotfire;
let mod: Spotfire.Mod = undefined as any;
export let context: Spotfire.RenderContext = undefined as any;

export function init(callback: OnLoadCallback) {
    Spotfire.initialize(async _mod => {
        mod = _mod;
        context = mod.getRenderContext();
        callback(mod);
    });
}

export function runtime<T extends ReadonlyArray<Readable>>(
    ...readables: T
): Reader<ExtractValueType<T>>["subscribe"] {
    return ((onChangeCallback: any) => {
        const reader = mod.createReader(...readables);
        let interaction = interactionLock();

        reader.subscribe(generalErrorHandler(mod)(onChange), err => {
            mod.controls.errorOverlay.show(err);
        });

        async function onChange(...args: any) {
            mod.controls.errorOverlay.hide();
            await interaction.interactionInProgress();
            await onChangeCallback(...args);

            context.signalRenderComplete();
        }
    }) as any;
}

/**
 * subscribe callback wrapper with general error handling, row count check and an early return when the data has become invalid while fetching it.
 *
 * The only requirement is that the dataview is the first argument.
 * @param mod - The mod API, used to show error messages.
 * @param rowLimit - Optional row limit.
 */
export function generalErrorHandler<T extends (...args: any) => any>(
    mod: Spotfire.Mod,
    rowLimit = 2000
): (a: T) => T {
    return function (callback: T) {
        return async function callbackWrapper(
            potentialDataView: any,
            ...args: any
        ) {
            let dataView: Spotfire.DataView = potentialDataView;

            try {
                const errors = await dataView.getErrors();
                if (errors.length > 0) {
                    mod.controls.errorOverlay.show(errors, "DataView");
                    return;
                }
                mod.controls.errorOverlay.hide("DataView");

                /**
                 * Hard abort if row count exceeds an arbitrary selected limit
                 */
                const rowCount = await dataView.rowCount();
                if (rowCount && rowCount > rowLimit) {
                    mod.controls.errorOverlay.show(
                        `☹️ Cannot render - too many rows (rowCount: ${rowCount}, limit: ${rowLimit}) `,
                        "General"
                    );
                    return;
                }

                /**
                 * User interaction while rows were fetched. Return early and respond to next subscribe callback.
                 */
                const allRows = await dataView.allRows();
                if (allRows == null) {
                    return;
                }

                await callback(dataView, ...args);

                mod.controls.errorOverlay.hide("General");
            } catch (e: any) {
                mod.controls.errorOverlay.show(
                    e.message ||
                        e ||
                        "☹️ Something went wrong, check developer console",
                    "General"
                );

                console.error(e);
            }
        } as T;
    };
}
