import type {Picture} from "../session/picture";
import {UI_STRINGS} from "../strings";
import {pictureCaption} from "./pictureCaption";

interface PhotoPileProps {
    pictures: Picture[]; // Newest first
}

// The pictures the duck has talked about
export function PhotoPile({pictures}: PhotoPileProps) {
    return (
        <div className="pile">
            {pictures.length === 0 && (
                <div className="pile__placeholder">{UI_STRINGS.pilePlaceholder}</div>
            )}

            {pictures.map((picture, depth) => (
                <figure
                    key={picture.id}
                    className="pile__photo"
                    data-depth={depth}
                    data-origin={picture.origin}
                    aria-hidden={depth > 0}
                >
                    <img src={picture.url} alt={pictureCaption(picture)}/>
                    <figcaption>{pictureCaption(picture)}</figcaption>
                </figure>
            ))}
        </div>
    );
}