export function labelsFitSpace(width: number, height: number, labelSize: number) {
    return height / 2 > labelSize && labelSize * 0.8 * 8 < width;
}

export function scaleFitSpace(width: number, height: number, labelSize: number) {
    return height / 2 > labelSize * 2 && labelSize * 0.7 * 8 < width;
}

export function labelWidth(size: number, str: string) {
    const fontWidth = size * 0.8;
    return str.length * fontWidth;
}

export function adjustedLabel(str: string, availableWidth: number, fontSize: number) {
    const fontWidth = fontSize * 0.75;
    const maxCharacters = availableWidth / fontWidth;
    if (str.length > maxCharacters) {
        if (maxCharacters < 2) {
            return "";
        }

        return str.slice(0, Math.max(1, availableWidth / fontWidth - 2)) + "…";
    }

    return str;
}

export function luminance(r: number, g: number, b: number) {
    var a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function contrastToLabelColor(fillColor: string, labelColorLuminance: number) {
    var fillLuminance = luminance(
        parseInt(fillColor.substr(1, 2), 16),
        parseInt(fillColor.substr(3, 2), 16),
        parseInt(fillColor.substr(5, 2), 16)
    );
    var brightest = Math.max(fillLuminance, labelColorLuminance);
    var darkest = Math.min(fillLuminance, labelColorLuminance);
    return (brightest + 0.05) / (darkest + 0.05);
}
