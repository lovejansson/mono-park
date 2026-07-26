import ArtObject from "./objects/ArtObject.ts";
import Sprite from "./objects/Sprite.ts";
import StaticImage from "./objects/StaticImage.ts";

export type CollisionResult = {
    obj: ArtObject;
    blocked: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    overlap: { x: number; y: number };
};

/**
 * Axis-Aligned Bounding Box (AABB) collision detection
 */
export function getCollision(obj1: Sprite | StaticImage, obj2: Sprite | StaticImage): CollisionResult | null {
    const box1 = { x: obj1.pos.x, y: obj1.pos.y, width: obj1.width, height: obj1.height };
    const box2 = { x: obj2.pos.x, y: obj2.pos.y, width: obj2.width, height: obj2.height };

    const box1XEnd = box1.x + box1.width;
    const box2XEnd = box2.x + box2.width;
    const box1YEnd = box1.y + box1.height;
    const box2YEnd = box2.y + box2.height;

    const isColliding = !(box1XEnd <= box2.x || box1YEnd <= box2.y || box1.x >= box2XEnd || box1.y >= box2YEnd);

    if (isColliding) {
        const overlapRight = box1XEnd - box2.x;
        const overlapLeft = box2XEnd - box1.x;
        const overlapTop = box2YEnd - box1.y;
        const overlapBottom = box1YEnd - box2.y;

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        const blocked = { top: false, right: false, bottom: false, left: false };

        if (minOverlap === overlapRight) blocked.right = true;
        else if (minOverlap === overlapLeft) blocked.left = true;
        else if (minOverlap === overlapBottom) blocked.bottom = true;
        else if (minOverlap === overlapTop) blocked.top = true;

        return {
            obj: obj2,
            blocked,
            overlap: { x: Math.min(overlapLeft, overlapRight), y: Math.min(overlapTop, overlapBottom) }
        };
    }

    return null;
}

/* -------------------- SAT collision -------------------- */

export type Vertex = { x: number; y: number };
export type Polygon = { vertices: Vertex[] };

function dot(v1: Vertex, v2: Vertex): number {
    return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Separating Axis Theorem collision detection
 */
export function isCollidingSAT(p1: Polygon, p2: Polygon): boolean {
    function getMinSeparation(poly1: Polygon, poly2: Polygon): number {
        let separation = -Infinity;

        for (let i = 0; i < poly1.vertices.length; i++) {
            let minSeparation = Infinity;

            const v1 = poly1.vertices[i];
            const v2 = poly1.vertices[(i + 1) % poly1.vertices.length];

            const edge = { x: v2.x - v1.x, y: v2.y - v1.y };
            const normal = { x: edge.y, y: -edge.x };
            const magnitude = Math.sqrt(normal.x ** 2 + normal.y ** 2);
            const normalizedNormal = { x: normal.x / magnitude, y: normal.y / magnitude };

            for (const v2b of poly2.vertices) {
                const diffVec = { x: v2b.x - v1.x, y: v2b.y - v1.y };
                minSeparation = Math.min(minSeparation, dot(diffVec, normalizedNormal));
            }

            separation = Math.max(separation, minSeparation);
        }

        return separation;
    }

    return getMinSeparation(p1, p2) <= 0 && getMinSeparation(p2, p1) <= 0;
}

/**
 * Converts an axis-aligned rectangle to a polygon
 */
export function toPolygon(x: number, y: number, width: number, height: number): Polygon {
    return {
        vertices: [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height }
        ]
    };
}