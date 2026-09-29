import {configCanvasContext} from "../../utils/helper.ts";

export interface RabbitState {
    /**
     * How far each ear stands up, as seen on screen: 0 = drooping, 1 = upright.
     * Driven by springs, so it briefly overshoots 1 when the ears perk up.
     */
    leftEarLift: number;
    rightEarLift: number;
    /** Head tilt in radians. Negative leans towards the duck, on the left. */
    headTilt: number;
    /** Horizontal gaze offset in design units. Negative looks left, towards the duck and the easel. */
    gaze: number;
    /** Eye blink amount: 0 to 1 */
    blink: number;
    /** Breathing cycle phase: -1 to 1 */
    breathe: number;
    /** 0 to 1: how far into the drawing pose the rabbit is (tongue out, brush moving). */
    focus: number;
    /** Phase of the little circles the brush paw makes while drawing, in radians. */
    brushPhase: number;
}

export const RABBIT_COLORS = {
    fur: "#f7f2ec",
    belly: "#fffdfa",
    outline: "#bba995",
    innerEar: "#ffbfcb",
    nose: "#f58ea3",
    noseEdge: "#d9728a",
    mouth: "#6b4a3f",
    tongue: "#e8737f",
    eye: "#2e2420",
    blush: "#ff9aa8",
    whisker: "#c9b8a6",
    brushHandle: "#c98b4f",
    brushFerrule: "#b9c0c9",
    brushPaint: "#6c8cf5",
};
export type RabbitColors = typeof RABBIT_COLORS;

// Virtual canvas dimensions. Taller than the duck's 420x420 because upright
// ears need headroom; the feet sit the same distance above the bottom edge as
// the duck's, so the two stand on the same floor when their boxes are aligned.
export const RABBIT_W = 420;
export const RABBIT_H = 540;

/**
 * Ear pose at the two extremes, in degrees measured from straight up.
 * `angle` is where the ear leaves the head, `bend` is how much further the
 * tip turns. Drooping ears point sideways and bend down, like a lop rabbit.
 */
const EAR_POSE = {
    upright: {angle: 10, bend: -8},
    drooping: {angle: 112, bend: 55},
};

const EAR_LENGTH = 152;
const EAR_HALF_WIDTH = 26;

export function drawRabbit(
    ctx: CanvasRenderingContext2D,
    state: RabbitState,
    colors: RabbitColors = RABBIT_COLORS,
): void {
    const {leftEarLift, rightEarLift, headTilt, gaze, blink, breathe, focus, brushPhase} = state;

    // Base layout coordinates
    const centerX = RABBIT_W / 2;
    const headCenterY = 298 + breathe * 4;
    const bodyCenterY = 440 + breathe * 2;
    const headRadiusX = 100;
    const headRadiusY = 90;

    const applyPaint = configCanvasContext(ctx);

    // Helper: Trace an ellipse path
    const traceEllipse = (x: number, y: number, radiusX: number, radiusY: number, rotation = 0) => {
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    };

    // 1. Feet
    for (const offsetX of [-44, 44]) {
        traceEllipse(centerX + offsetX, bodyCenterY + 72, 32, 13);
        applyPaint(colors.fur, colors.outline);
    }

    // 2. Body and belly
    traceEllipse(centerX, bodyCenterY, 88, 78);
    applyPaint(colors.fur, colors.outline);
    traceEllipse(centerX, bodyCenterY + 12, 52, 50);
    applyPaint(colors.belly);

    // 3. Head group: everything above the neck tilts together
    ctx.save();
    const neckY = headCenterY + 70;
    ctx.translate(centerX, neckY);
    ctx.rotate(headTilt);
    ctx.translate(-centerX, -neckY);

    // 3a. Ears go behind the head, so their roots are hidden inside it
    const earRootY = headCenterY - headRadiusY + 14;
    drawEar(ctx, colors, centerX - 36, earRootY, -1, leftEarLift, breathe);
    drawEar(ctx, colors, centerX + 36, earRootY, 1, rightEarLift, breathe);

    // 3b. Head
    traceEllipse(centerX, headCenterY, headRadiusX, headRadiusY);
    applyPaint(colors.fur, colors.outline);

    // The face slides slightly towards the gaze, which reads as the head turning
    const faceX = centerX + gaze * 0.8;

    // 3c. Blush (rendered with semi-transparency)
    ctx.globalAlpha = 0.55;
    for (const offsetX of [-60, 60]) {
        traceEllipse(faceX + offsetX, headCenterY + 24, 19, 12);
        applyPaint(colors.blush);
    }
    ctx.globalAlpha = 1;

    // 3d. Eyes (same construction as the duck's, so the two read as one cast)
    for (const offsetX of [-38, 38]) {
        const eyeX = faceX + offsetX + gaze * 0.4;
        const eyeY = headCenterY - 12;

        if (blink > 0.6) {
            ctx.beginPath();
            ctx.moveTo(eyeX - 14, eyeY);
            ctx.quadraticCurveTo(eyeX, eyeY + 7, eyeX + 14, eyeY);
            applyPaint(null, colors.eye);
        } else {
            const eyeRadiusY = 16 * (1 - blink);
            traceEllipse(eyeX, eyeY, 13, eyeRadiusY);
            applyPaint(colors.eye);

            if (eyeRadiusY > 8) {
                traceEllipse(eyeX + 4.5, eyeY - 5, 4.5, 4.5);
                applyPaint("#fff");
            }
        }
    }

    // 3e. Whiskers
    ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
        for (const tipOffsetY of [-6, 8]) {
            ctx.beginPath();
            ctx.moveTo(faceX + side * 34, headCenterY + 22);
            ctx.lineTo(faceX + side * 80, headCenterY + 22 + tipOffsetY);
            applyPaint(null, colors.whisker);
        }
    }
    ctx.lineWidth = 5;

    // 3f. Nose: a small rounded triangle
    const noseY = headCenterY + 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(faceX - 10, noseY - 4);
    ctx.quadraticCurveTo(faceX, noseY - 8, faceX + 10, noseY - 4);
    ctx.quadraticCurveTo(faceX + 3, noseY + 7, faceX, noseY + 7);
    ctx.quadraticCurveTo(faceX - 3, noseY + 7, faceX - 10, noseY - 4);
    ctx.closePath();
    applyPaint(colors.nose, colors.noseEdge);

    // 3g. Mouth: the classic bunny "ω", with the tongue poking out while concentrating
    const mouthTopY = noseY + 7;
    const mouthY = mouthTopY + 8;

    if (focus > 0.05) {
        const tongueX = faceX + 7;
        const tongueTopY = mouthY + 2;
        const tongueLength = 12 * focus;
        const tongueHalfWidth = 6.5 * focus;

        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tongueX - tongueHalfWidth, tongueTopY);
        ctx.quadraticCurveTo(tongueX - tongueHalfWidth, tongueTopY + tongueLength, tongueX, tongueTopY + tongueLength);
        ctx.quadraticCurveTo(tongueX + tongueHalfWidth, tongueTopY + tongueLength, tongueX + tongueHalfWidth, tongueTopY);
        ctx.closePath();
        applyPaint(colors.tongue, colors.mouth);
    }

    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(faceX, mouthTopY);
    ctx.lineTo(faceX, mouthY);
    ctx.moveTo(faceX - 13, mouthY + 1);
    ctx.quadraticCurveTo(faceX - 6, mouthY + 9, faceX, mouthY);
    ctx.quadraticCurveTo(faceX + 6, mouthY + 9, faceX + 13, mouthY + 1);
    applyPaint(null, colors.mouth);
    ctx.lineWidth = 5;

    ctx.restore();

    // 4. Paws, with the brush held in the one nearest the easel
    const strokeReach = focus * 7;
    const brushPawX = centerX - 40 + Math.cos(brushPhase) * strokeReach;
    const brushPawY = bodyCenterY - 22 - focus * 10 + Math.sin(brushPhase) * strokeReach;
    const brushAngle = -0.62 - focus * 0.25 + Math.sin(brushPhase) * 0.12 * focus;

    drawBrush(ctx, colors, brushPawX, brushPawY, brushAngle);

    traceEllipse(brushPawX, brushPawY, 17, 14);
    applyPaint(colors.fur, colors.outline);
    traceEllipse(centerX + 40, bodyCenterY - 16, 17, 14);
    applyPaint(colors.fur, colors.outline);
}

/**
 * One ear, traced as a tapered band around a curved centreline.
 *
 * The centreline is a quadratic curve whose two halves point at `angle` and
 * `angle + bend`, so a single `lift` value smoothly takes the ear from a
 * floppy sideways droop to standing up straight.
 *
 * Values of `lift` above 1 are the spring overshooting. Rotating further would
 * cross the ears over each other, so the extra energy goes into stretching the
 * ear instead — the usual squash-and-stretch trick, and it reads as a "boing".
 */
function drawEar(
    ctx: CanvasRenderingContext2D,
    colors: RabbitColors,
    rootX: number,
    rootY: number,
    side: -1 | 1,
    lift: number,
    breathe: number,
): void {
    const {upright, drooping} = EAR_POSE;
    // Swinging past the droop would tuck the ears behind the head, so the bounce is kept tiny
    const settledLift = Math.min(Math.max(lift, -0.06), 1);
    const overshoot = Math.max(0, lift - 1);

    // A drooping ear sways a little with each breath, an upright one barely moves
    const sway = breathe * (1 - settledLift) * 3;
    const angleDeg = drooping.angle + (upright.angle - drooping.angle) * settledLift + sway;
    const bendDeg = drooping.bend + (upright.bend - drooping.bend) * settledLift - overshoot * 30;
    const earLength = EAR_LENGTH * (1 + overshoot * 0.6);

    const toRadians = Math.PI / 180;
    const rootAngle = angleDeg * toRadians;
    const tipAngle = (angleDeg + bendDeg) * toRadians;

    // Angles are measured from straight up; `side` mirrors the left ear
    const controlX = rootX + side * Math.sin(rootAngle) * earLength * 0.5;
    const controlY = rootY - Math.cos(rootAngle) * earLength * 0.5;
    const tipX = controlX + side * Math.sin(tipAngle) * earLength * 0.55;
    const tipY = controlY - Math.cos(tipAngle) * earLength * 0.55;

    const pointAt = (t: number) => {
        const u = 1 - t;
        return {
            x: u * u * rootX + 2 * u * t * controlX + t * t * tipX,
            y: u * u * rootY + 2 * u * t * controlY + t * t * tipY,
        };
    };
    const directionAt = (t: number) => {
        const dx = 2 * (1 - t) * (controlX - rootX) + 2 * t * (tipX - controlX);
        const dy = 2 * (1 - t) * (controlY - rootY) + 2 * t * (tipY - controlY);
        const length = Math.hypot(dx, dy);
        return {x: dx / length, y: dy / length};
    };

    // Widest in the middle, narrower at the root, rounded at the tip
    const widthAt = (t: number) =>
        (0.72 + 0.28 * Math.sin(Math.PI * t * 0.9)) * Math.sqrt(1 - t ** 3);

    const traceBand = (fromT: number, toT: number, halfWidth: number) => {
        const STEPS = 36;
        const leftEdge: { x: number; y: number }[] = [];
        const rightEdge: { x: number; y: number }[] = [];

        for (let step = 0; step <= STEPS; step++) {
            const t = fromT + (toT - fromT) * (step / STEPS);
            const point = pointAt(t);
            const direction = directionAt(t);
            const width = halfWidth * widthAt(t);
            leftEdge.push({x: point.x - direction.y * width, y: point.y + direction.x * width});
            rightEdge.push({x: point.x + direction.y * width, y: point.y - direction.x * width});
        }

        ctx.beginPath();
        ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
        for (const point of leftEdge) ctx.lineTo(point.x, point.y);
        for (const point of rightEdge.reverse()) ctx.lineTo(point.x, point.y);
        ctx.closePath();
    };

    traceBand(0, 1, EAR_HALF_WIDTH);
    ctx.fillStyle = colors.fur;
    ctx.fill();
    ctx.strokeStyle = colors.outline;
    ctx.stroke();

    // A hanging ear shows its back to the viewer, so the pink inside mostly hides
    traceBand(0.14, 0.94, EAR_HALF_WIDTH * 0.5);
    ctx.globalAlpha = 0.35 + 0.65 * Math.max(0, settledLift);
    ctx.fillStyle = colors.innerEar;
    ctx.fill();
    ctx.globalAlpha = 1;
}

/** A paintbrush whose handle starts in the paw and points up and away at `angle` radians. */
function drawBrush(
    ctx: CanvasRenderingContext2D,
    colors: RabbitColors,
    pawX: number,
    pawY: number,
    angle: number,
): void {
    ctx.save();
    ctx.translate(pawX, pawY);
    ctx.rotate(angle);

    // Handle, running from below the paw up to the ferrule
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(0, -46);
    ctx.lineWidth = 7;
    ctx.strokeStyle = colors.brushHandle;
    ctx.stroke();

    // Metal ferrule
    ctx.beginPath();
    ctx.rect(-5, -60, 10, 15);
    ctx.fillStyle = colors.brushFerrule;
    ctx.fill();

    // Bristles, dipped in paint
    ctx.beginPath();
    ctx.moveTo(-5, -60);
    ctx.quadraticCurveTo(-6, -74, 0, -84);
    ctx.quadraticCurveTo(6, -74, 5, -60);
    ctx.closePath();
    ctx.fillStyle = colors.brushPaint;
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.restore();
}
