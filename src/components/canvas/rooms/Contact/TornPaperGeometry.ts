import * as THREE from 'three';

export function createTornPaperGeometry(
    width = 1.2,
    height = 1.6,
    segmentsX = 20,
    segmentsY = 26,
    tearIntensity = 0.04
) {
    const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    const positions = geometry.attributes.position;

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const seed = 12345;
    const seededRandom = (i: number) => {
        const x = Math.sin(seed + i * 9999) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);

        const onLeftEdge = Math.abs(x + halfWidth) < 0.01;
        const onRightEdge = Math.abs(x - halfWidth) < 0.01;
        const onTopEdge = Math.abs(y - halfHeight) < 0.01;
        const onBottomEdge = Math.abs(y + halfHeight) < 0.01;

        if (onLeftEdge || onRightEdge || onTopEdge || onBottomEdge) {
            const tearX = (seededRandom(i) - 0.5) * tearIntensity;
            const tearY = (seededRandom(i + 1000) - 0.5) * tearIntensity;

            const leftMultiplier = onLeftEdge ? 2.5 : 1;

            positions.setX(i, x + tearX * leftMultiplier);
            positions.setY(i, y + tearY * leftMultiplier);

            const tearZ = seededRandom(i + 2000) * 0.01;
            positions.setZ(i, tearZ);
        }

        const warpZ = Math.sin(x * 3) * Math.cos(y * 2) * 0.015;
        positions.setZ(i, positions.getZ(i) + warpZ);
    }

    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;

    return geometry;
}

export function getRuledLinePositions(height: number, lineCount = 8, topMargin = 0.15, bottomMargin = 0.2): number[] {
    const usableHeight = height - topMargin - bottomMargin;
    const spacing = usableHeight / (lineCount + 1);
    const startY = (height / 2) - topMargin - spacing;

    const lines = [];
    for (let i = 0; i < lineCount; i++) {
        lines.push(startY - i * spacing);
    }
    return lines;
}

export default createTornPaperGeometry;
