function ClearGrid() {
    var DOMGrid = document.getElementById('grid_id');
    DOMGrid.innerHTML = '';
}

function AddBlock(x, y, color) {
    var DOMGrid = document.getElementById('grid_id');

    var newDiv = document.createElement('div');
    newDiv.setAttribute('id', 'gx' + x + 'y' + y);
    newDiv.setAttribute('class', color);
    DOMGrid.appendChild(newDiv);
}

function ChangeBlockColor(x, y, color) {
    targetDiv = document.getElementById('gx' + x + 'y' + y);
    targetDiv.setAttribute('class', color);
}

function isObstacle(obstacles, y, x) {
    return isBorderBlock(y, x) || obstacles[`${y}.${x}`] === 2;
}

function isBorderBlock(y, x) {
    return x === 0 || y === 0 || x === 19 || y === 19;
}

function getRandom(start, end) {
    let base = Math.random() * (end - start);
    return base + start;
}

function getSign(n) {
    return n / Math.abs(n);
}
