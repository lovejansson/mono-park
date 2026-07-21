/**
 * Removes an element at a specific index from the array.
 * 
 * @param {number} idx The index of the element to remove.
 * @returns {void} This method modifies the array in-place and does not return a value.
 */
Array.prototype.remove = function(idx) {
    this.splice(idx, 1);
}

/**
 * Returns a random element from the array.
 * 
 * @returns {*} A random element from the array. The type can be any, depending on the contents of the array.
 */
Array.prototype.random = function() {
    const randomIdx = Math.floor(Math.random() * this.length);
    return this[randomIdx];
}