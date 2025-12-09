// Grey Code Conversion Helpers
// Standard 4-bit Grey Code conversion

/**
 * Convert a 4-element binary array to its Grey Code integer value
 * @param {number[]} arr - Array of 4 binary values [b0, b1, b2, b3]
 * @returns {number} Grey Code integer (0-15)
 */
export function binaryArrayToGreyCodeInt(arr) {
  if (!Array.isArray(arr) || arr.length !== 4) {
    throw new Error('Input must be a 4-element array');
  }

  // Convert binary array to decimal (b0 is MSB)
  const binary = (arr[0] << 3) | (arr[1] << 2) | (arr[2] << 1) | arr[3];

  // Convert binary to Grey Code: G = B XOR (B >> 1)
  const greyCode = binary ^ (binary >> 1);

  return greyCode;
}

/**
 * Convert a Grey Code integer back to a 4-element binary array
 * @param {number} gci - Grey Code integer (0-15)
 * @returns {number[]} Array of 4 binary values [b0, b1, b2, b3]
 */
export function greyCodeIntToBinaryArray(gci) {
  if (gci < 0 || gci > 15) {
    throw new Error('Grey Code integer must be between 0 and 15');
  }

  // Convert Grey Code to binary
  // Binary = Grey XOR (Grey >> 1) XOR (Grey >> 2) XOR ...
  let binary = gci;
  for (let mask = gci >> 1; mask !== 0; mask >>= 1) {
    binary ^= mask;
  }

  // Convert decimal to 4-element binary array
  return [
    (binary >> 3) & 1,
    (binary >> 2) & 1,
    (binary >> 1) & 1,
    binary & 1
  ];
}

/**
 * Standard 4-bit Grey Code lookup table
 * Index = binary value, Value = Grey Code
 */
export const GREY_CODE_TABLE = [
  0,   // Binary 0000 -> Grey 0000
  1,   // Binary 0001 -> Grey 0001
  3,   // Binary 0010 -> Grey 0011
  2,   // Binary 0011 -> Grey 0010
  6,   // Binary 0100 -> Grey 0110
  7,   // Binary 0101 -> Grey 0111
  5,   // Binary 0110 -> Grey 0101
  4,   // Binary 0111 -> Grey 0100
  12,  // Binary 1000 -> Grey 1100
  13,  // Binary 1001 -> Grey 1101
  15,  // Binary 1010 -> Grey 1111
  14,  // Binary 1011 -> Grey 1110
  10,  // Binary 1100 -> Grey 1010
  11,  // Binary 1101 -> Grey 1011
  9,   // Binary 1110 -> Grey 1001
  8    // Binary 1111 -> Grey 1000
];

/**
 * Reverse lookup: Grey Code to binary
 */
export const BINARY_TABLE = [
  0, 1, 3, 2, 7, 6, 4, 5, 15, 14, 12, 13, 8, 9, 11, 10
];
