export interface DuckState {
    /** Beak opening amount: 0 to 1 */
    open: number;
    /** Eye blink amount: 0 to 1 */
    blink: number;
    /** Tongue visibility: 0 to 1 */
    tongue: number;
    /** Breathing cycle phase: -1 to 1 */
    breathe: number;
}

export const DUCK_COLORS = {
    body: "#ffd24a",
    bodyDark: "#f0b92e", // Wings
    bill: "#f2a03d",
    billEdge: "#c2761c",
    inner: "#5c1f17",   // Mouth cavity
    tongue: "#e8737f",
    eye: "#2e2420",
    blush: "#ff9aa8",
    outline: "#c99417",
};
export type DuckColors = typeof DUCK_COLORS;

// Virtual canvas dimensions. Scale with ctx.scale during rendering; do not mutate.
export const DUCK_W = 420;
export const DUCK_H = 420;

export function drawDuck(
    ctx: CanvasRenderingContext2D,
    state: Partial<DuckState>,
    colors: DuckColors = DUCK_COLORS,
) {
    const {open = 0, blink = 0, tongue = 0, breathe = 0} = state;

    // Base layout coordinates
    const centerX = DUCK_W / 2;
    const headCenterY = 168 + breathe * 4;  // Slight vertical bobbing during breathing
    const headRadius = 104;
    const bodyCenterY = 306 + breathe * 2;  // Subtle body breathing movement

    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Helper: Apply fill and stroke styles
    const applyPaint = (fillColor?: string | null, strokeColor?: string | null) => {
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        }
    };

    // Helper: Trace an ellipse path
    const traceEllipse = (
        x: number,
        y: number,
        radiusX: number,
        radiusY: number,
        rotation = 0,
    ) => {
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    };

    // 1. Feet (rendered at the bottom-most layer)
    const footOffsetsX = [-40, 40];
    for (const offsetX of footOffsetsX) {
        traceEllipse(centerX + offsetX, bodyCenterY + 84, 26, 12);
        applyPaint(colors.bill, colors.billEdge);
    }

    // 2. Body
    traceEllipse(centerX, bodyCenterY, 98, 86);
    applyPaint(colors.body, colors.outline);

    // 3. Left Wing (rotated by -12 degrees in radians)
    const wingAngle = (-12 * Math.PI) / 180;
    traceEllipse(centerX - 66, bodyCenterY + 6, 30, 46, wingAngle);
    applyPaint(colors.bodyDark, colors.outline);

    // 4. Head
    traceEllipse(centerX, headCenterY, headRadius, headRadius);
    applyPaint(colors.body, colors.outline);

    // 5. Blush (rendered with semi-transparency)
    ctx.globalAlpha = 0.55;
    const blushOffsetsX = [-62, 62];
    for (const offsetX of blushOffsetsX) {
        traceEllipse(centerX + offsetX, headCenterY + 26, 20, 13);
        applyPaint(colors.blush);
    }
    ctx.globalAlpha = 1;

    // 6. Eyes (switches from open eye with highlight to a curved eyelid when blinking)
    const eyeOffsetsX = [-40, 40];
    for (const offsetX of eyeOffsetsX) {
        const eyeX = centerX + offsetX;
        const eyeY = headCenterY - 16;

        if (blink > 0.6) {
            // Closed eye arc
            ctx.beginPath();
            ctx.moveTo(eyeX - 15, eyeY);
            ctx.quadraticCurveTo(eyeX, eyeY + 7, eyeX + 15, eyeY);
            applyPaint(null, colors.eye);
        } else {
            // Open eye with dynamic vertical compression
            const eyeRadiusY = 16 * (1 - blink);
            traceEllipse(eyeX, eyeY, 13, eyeRadiusY);
            applyPaint(colors.eye);

            // Specular reflection highlight
            if (eyeRadiusY > 8) {
                traceEllipse(eyeX + 4.5, eyeY - 5, 4.5, 4.5);
                applyPaint("#fff");
            }
        }
    }

    // 7. Beak and Mouth Assembly
    const beakBaseY = headCenterY + 46;
    const beakScale = 210;
    const beakRatios = {
        width: 0.255,
        arch: 0.014,
        billHeight: 0.058,
        hingeOffset: 0.13,
    };

    const openOffset = open * 0.185 * beakScale;
    const beakHalfWidth = beakRatios.width * beakScale;
    const beakArchHeight = beakRatios.arch * beakScale;
    const baseBillHeight = beakRatios.billHeight * beakScale;

    // Lateral corner positions where the upper and lower bills meet
    const hingeY = beakBaseY + openOffset * beakRatios.hingeOffset;
    const lowerBillBottomY = beakBaseY + openOffset + openOffset * 0.42 + baseBillHeight;

    // Traces the inner gap contour between upper and lower bills
    const traceMouthGap = () => {
        ctx.beginPath();
        ctx.moveTo(centerX - beakHalfWidth, hingeY);
        ctx.quadraticCurveTo(centerX, hingeY - beakArchHeight * 2, centerX + beakHalfWidth, hingeY);
        ctx.quadraticCurveTo(centerX, beakBaseY + openOffset + openOffset * 0.42, centerX - beakHalfWidth, hingeY);
        ctx.closePath();
    };

    // Render inner mouth cavity and tongue when beak is open
    if (openOffset > 1) {
        traceMouthGap();
        applyPaint(colors.inner);

        if (tongue > 0) {
            ctx.save();
            traceMouthGap();
            ctx.clip(); // Mask tongue within the mouth opening
            traceEllipse(
                centerX,
                beakBaseY + openOffset * 0.92,
                beakHalfWidth * 0.6,
                openOffset * 0.52 * tongue,
            );
            applyPaint(colors.tongue);
            ctx.restore();
        }
    }

    // Upper bill (static position relative to head)
    ctx.beginPath();
    ctx.moveTo(centerX - beakHalfWidth, hingeY);
    ctx.quadraticCurveTo(centerX, hingeY - beakArchHeight * 2, centerX + beakHalfWidth, hingeY);
    ctx.quadraticCurveTo(centerX + beakHalfWidth * 1.03, hingeY - 26, centerX, hingeY - 32);
    ctx.quadraticCurveTo(centerX - beakHalfWidth * 1.03, hingeY - 26, centerX - beakHalfWidth, hingeY);
    ctx.closePath();
    applyPaint(colors.bill, colors.billEdge);

    // Lower bill (moves downwards with openOffset)
    ctx.beginPath();
    ctx.moveTo(centerX - beakHalfWidth, hingeY);
    ctx.quadraticCurveTo(centerX, beakBaseY + openOffset + openOffset * 0.42, centerX + beakHalfWidth, hingeY);
    ctx.bezierCurveTo(
        centerX + beakHalfWidth * 0.99,
        hingeY + (lowerBillBottomY - hingeY) * 0.62,
        centerX + beakHalfWidth * 0.62,
        lowerBillBottomY,
        centerX,
        lowerBillBottomY,
    );
    ctx.bezierCurveTo(
        centerX - beakHalfWidth * 0.62,
        lowerBillBottomY,
        centerX - beakHalfWidth * 0.99,
        hingeY + (lowerBillBottomY - hingeY) * 0.62,
        centerX - beakHalfWidth,
        hingeY,
    );
    ctx.closePath();
    applyPaint(colors.bill, colors.billEdge);
}