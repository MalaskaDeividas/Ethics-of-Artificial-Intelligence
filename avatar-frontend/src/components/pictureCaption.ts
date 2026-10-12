import type {Picture} from "../session/picture";
import {UI_STRINGS} from "../strings";

/** "Your picture" or "Drawing #n": shared by the pile and the easel so they always agree. */
export function pictureCaption(picture: Picture): string {
    return picture.origin === "upload"
        ? UI_STRINGS.yourPicture
        : UI_STRINGS.drawingCaption(picture.drawingNumber!);
}