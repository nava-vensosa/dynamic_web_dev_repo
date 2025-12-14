// Matrix Utilities for 128x128 Probability Matrices
// Core operations for the Dynamic Bayesian Network

import { MIDI_MAX, MAJOR_SCALE_INTERVALS } from '../../utils/constants.js';
import { logDebug } from '../../utils/helpers/debug_log.js';

const CATEGORY = 'MatrixUtils';
const MATRIX_SIZE = MIDI_MAX + 1; // 128

/**
 * Create the Prior Matrix (128x128)
 * Initialized with uniform probability 1/(128*127), diagonal = 0
 * @returns {Float64Array[]} 128x128 matrix as array of Float64Arrays
 */
export function createPriorMatrix() {
  const uniformProb = 1 / (MATRIX_SIZE * (MATRIX_SIZE - 1));
  const matrix = new Array(MATRIX_SIZE);

  for (let row = 0; row < MATRIX_SIZE; row++) {
    matrix[row] = new Float64Array(MATRIX_SIZE);
    for (let col = 0; col < MATRIX_SIZE; col++) {
      // Diagonal (A == B) is always 0
      matrix[row][col] = (row === col) ? 0 : uniformProb;
    }
  }

  logDebug(CATEGORY, 'Created Prior Matrix', { size: MATRIX_SIZE, uniformProb });
  return matrix;
}

/**
 * Deep copy a 128x128 matrix
 * @param {Float64Array[]} matrix - Source matrix
 * @returns {Float64Array[]} Deep copy of the matrix
 */
export function copyMatrix(matrix) {
  const copy = new Array(MATRIX_SIZE);

  for (let row = 0; row < MATRIX_SIZE; row++) {
    copy[row] = new Float64Array(matrix[row]);
  }

  return copy;
}

/**
 * Normalize a matrix so all cells sum to ~1.0
 * @param {Float64Array[]} matrix - Matrix to normalize
 * @returns {Float64Array[]} Normalized matrix (same reference, modified in place)
 */
export function normalizeMatrix(matrix) {
  // Calculate sum of all cells
  let sum = 0;
  for (let row = 0; row < MATRIX_SIZE; row++) {
    for (let col = 0; col < MATRIX_SIZE; col++) {
      sum += matrix[row][col];
    }
  }

  // If sum is 0, return uniform distribution (excluding diagonal)
  if (sum === 0) {
    const uniformProb = 1 / (MATRIX_SIZE * (MATRIX_SIZE - 1));
    for (let row = 0; row < MATRIX_SIZE; row++) {
      for (let col = 0; col < MATRIX_SIZE; col++) {
        matrix[row][col] = (row === col) ? 0 : uniformProb;
      }
    }
    return matrix;
  }

  // Normalize
  for (let row = 0; row < MATRIX_SIZE; row++) {
    for (let col = 0; col < MATRIX_SIZE; col++) {
      matrix[row][col] /= sum;
    }
  }

  return matrix;
}

/**
 * Scale all cells of a matrix by a weight
 * @param {Float64Array[]} matrix - Matrix to scale
 * @param {number} weight - Scale factor
 * @returns {Float64Array[]} Scaled matrix (same reference, modified in place)
 */
export function scaleMatrix(matrix, weight) {
  for (let row = 0; row < MATRIX_SIZE; row++) {
    for (let col = 0; col < MATRIX_SIZE; col++) {
      matrix[row][col] *= weight;
    }
  }
  return matrix;
}

/**
 * Add multiple matrices element-wise
 * @param {Float64Array[][]} matrices - Array of matrices to sum
 * @returns {Float64Array[]} Sum matrix
 */
export function addMatrices(matrices) {
  const result = new Array(MATRIX_SIZE);

  for (let row = 0; row < MATRIX_SIZE; row++) {
    result[row] = new Float64Array(MATRIX_SIZE);
    for (let col = 0; col < MATRIX_SIZE; col++) {
      let sum = 0;
      for (const matrix of matrices) {
        sum += matrix[row][col];
      }
      result[row][col] = sum;
    }
  }

  return result;
}

/**
 * Get the pitch classes that belong to a major key
 * @param {number} keycenter - Root MIDI note
 * @returns {Set<number>} Set of valid pitch classes (0-11)
 */
export function getMajorKeyPitchClasses(keycenter) {
  const rootPitchClass = keycenter % 12;
  const pitchClasses = new Set();

  for (const interval of MAJOR_SCALE_INTERVALS) {
    pitchClasses.add((rootPitchClass + interval) % 12);
  }

  return pitchClasses;
}

/**
 * Zero out rows and columns for notes outside the major key
 * @param {Float64Array[]} matrix - Matrix to filter
 * @param {number} keycenter - Root MIDI note of the key
 * @returns {Float64Array[]} Filtered matrix (same reference, modified in place)
 */
export function zeroOutNonKeyNotes(matrix, keycenter) {
  const validPitchClasses = getMajorKeyPitchClasses(keycenter);

  for (let i = 0; i < MATRIX_SIZE; i++) {
    const pitchClass = i % 12;
    const isValid = validPitchClasses.has(pitchClass);

    if (!isValid) {
      // Zero out entire row
      for (let col = 0; col < MATRIX_SIZE; col++) {
        matrix[i][col] = 0;
      }
      // Zero out entire column
      for (let row = 0; row < MATRIX_SIZE; row++) {
        matrix[row][i] = 0;
      }
    }
  }

  return matrix;
}

/**
 * Zero out the identity diagonal (A == B)
 * @param {Float64Array[]} matrix - Matrix to modify
 * @returns {Float64Array[]} Modified matrix (same reference)
 */
export function zeroOutDiagonal(matrix) {
  for (let i = 0; i < MATRIX_SIZE; i++) {
    matrix[i][i] = 0;
  }
  return matrix;
}

/**
 * Multiply a matrix by a column vector (projection)
 * For each row A, sum over all columns B: matrix[A][B] * vector[B]
 * This gives us P(A) = sum over B of P(A|B) * P(B)
 * @param {Float64Array[]} matrix - 128x128 probability matrix
 * @param {number[]} vector - Size-128 vector (projection mask/weights)
 * @returns {Float64Array} Size-128 result vector
 */
export function matrixVectorMultiply(matrix, vector) {
  const result = new Float64Array(MATRIX_SIZE);

  for (let row = 0; row < MATRIX_SIZE; row++) {
    let sum = 0;
    for (let col = 0; col < MATRIX_SIZE; col++) {
      sum += matrix[row][col] * (vector[col] || 0);
    }
    result[row] = sum;
  }

  return result;
}

/**
 * Normalize a vector so all values sum to 1
 * @param {Float64Array|number[]} vector - Input vector
 * @returns {Float64Array} Normalized vector
 */
export function normalizeVectorFromMatrix(vector) {
  const result = new Float64Array(MATRIX_SIZE);
  let sum = 0;

  for (let i = 0; i < vector.length; i++) {
    sum += vector[i];
  }

  if (sum === 0) {
    // Return uniform distribution
    const uniformProb = 1 / MATRIX_SIZE;
    for (let i = 0; i < MATRIX_SIZE; i++) {
      result[i] = uniformProb;
    }
    return result;
  }

  for (let i = 0; i < vector.length; i++) {
    result[i] = vector[i] / sum;
  }

  return result;
}

/**
 * Add a boost value to specific cells in the matrix
 * @param {Float64Array[]} matrix - Matrix to modify
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} boost - Value to add
 */
export function boostCell(matrix, row, col, boost) {
  if (row >= 0 && row < MATRIX_SIZE && col >= 0 && col < MATRIX_SIZE) {
    matrix[row][col] += boost;
  }
}

/**
 * Create a zero matrix
 * @returns {Float64Array[]} 128x128 matrix of zeros
 */
export function createZeroMatrix() {
  const matrix = new Array(MATRIX_SIZE);
  for (let row = 0; row < MATRIX_SIZE; row++) {
    matrix[row] = new Float64Array(MATRIX_SIZE);
  }
  return matrix;
}

/**
 * Get the sum of all cells in a matrix (for debugging)
 * @param {Float64Array[]} matrix - Matrix to sum
 * @returns {number} Sum of all cells
 */
export function getMatrixSum(matrix) {
  let sum = 0;
  for (let row = 0; row < MATRIX_SIZE; row++) {
    for (let col = 0; col < MATRIX_SIZE; col++) {
      sum += matrix[row][col];
    }
  }
  return sum;
}

export default {
  createPriorMatrix,
  copyMatrix,
  normalizeMatrix,
  scaleMatrix,
  addMatrices,
  getMajorKeyPitchClasses,
  zeroOutNonKeyNotes,
  zeroOutDiagonal,
  matrixVectorMultiply,
  normalizeVectorFromMatrix,
  boostCell,
  createZeroMatrix,
  getMatrixSum,
  MATRIX_SIZE
};
