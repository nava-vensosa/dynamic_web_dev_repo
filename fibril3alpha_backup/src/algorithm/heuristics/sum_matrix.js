// Matrix Combination Utilities
// Helper functions for combining probability matrices and vectors

import { MIDI_MAX } from '../../utils/constants.js';
import { logDebug } from '../../utils/helpers/debug_log.js';
import {
  addMatrices as addMatricesUtil,
  normalizeMatrix,
  matrixVectorMultiply,
  normalizeVectorFromMatrix
} from './matrix_utils.js';

const CATEGORY = 'SumMatrix';
const VECTOR_SIZE = MIDI_MAX + 1; // 128

/**
 * Create a uniform distribution vector (size 128)
 * @returns {number[]} Uniform probability vector
 */
export function createUniformVector() {
  const value = 1 / VECTOR_SIZE;
  return new Array(VECTOR_SIZE).fill(value);
}

/**
 * Create a zero vector (size 128)
 * @returns {number[]} Zero vector
 */
export function createZeroVector() {
  return new Array(VECTOR_SIZE).fill(0);
}

/**
 * Normalize a vector so all values sum to 1
 * @param {number[]} vector - Input vector
 * @returns {number[]} Normalized vector
 */
export function normalizeVector(vector) {
  const sum = vector.reduce((acc, val) => acc + val, 0);

  if (sum === 0) {
    // Return uniform if all zeros
    return createUniformVector();
  }

  return vector.map(val => val / sum);
}

/**
 * Multiplicatively combine multiple probability vectors
 * @param {number[][]} vectors - Array of probability vectors
 * @returns {number[]} Combined and normalized vector
 */
export function multiplyVectors(vectors) {
  if (vectors.length === 0) {
    return createUniformVector();
  }

  if (vectors.length === 1) {
    return normalizeVector(vectors[0]);
  }

  // Element-wise multiplication
  const result = new Array(VECTOR_SIZE).fill(1);

  for (const vector of vectors) {
    for (let i = 0; i < VECTOR_SIZE; i++) {
      result[i] *= vector[i];
    }
  }

  return normalizeVector(result);
}

/**
 * Apply a binary mask to a probability vector
 * @param {number[]} probVector - Probability vector
 * @param {number[]} mask - Binary mask (0s and 1s)
 * @returns {number[]} Masked and normalized vector
 */
export function applyMask(probVector, mask) {
  const result = new Array(VECTOR_SIZE).fill(0);

  for (let i = 0; i < VECTOR_SIZE; i++) {
    result[i] = probVector[i] * mask[i];
  }

  return normalizeVector(result);
}

/**
 * Sample a note from a probability distribution
 * @param {number[]} probVector - Normalized probability vector
 * @returns {number} Sampled MIDI note (0-127)
 */
export function sampleFromDistribution(probVector) {
  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < probVector.length; i++) {
    cumulative += probVector[i];
    if (random <= cumulative) {
      logDebug(CATEGORY, 'Sampled note', { note: i, probability: probVector[i] });
      return i;
    }
  }

  // Fallback (shouldn't happen if properly normalized)
  return VECTOR_SIZE - 1;
}

/**
 * Get the highest probability note from a distribution
 * @param {number[]} probVector - Probability vector
 * @returns {number} MIDI note with highest probability
 */
export function getMaxProbabilityNote(probVector) {
  let maxIndex = 0;
  let maxValue = probVector[0];

  for (let i = 1; i < probVector.length; i++) {
    if (probVector[i] > maxValue) {
      maxValue = probVector[i];
      maxIndex = i;
    }
  }

  return maxIndex;
}

/**
 * Add two vectors element-wise
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number[]} Sum vector
 */
export function addVectors(a, b) {
  const result = new Array(VECTOR_SIZE).fill(0);

  for (let i = 0; i < VECTOR_SIZE; i++) {
    result[i] = (a[i] || 0) + (b[i] || 0);
  }

  return result;
}

/**
 * Scale a vector by a constant
 * @param {number[]} vector - Input vector
 * @param {number} scale - Scale factor
 * @returns {number[]} Scaled vector
 */
export function scaleVector(vector, scale) {
  return vector.map(val => val * scale);
}

/**
 * Compute the Sum Matrix from three heuristic matrices
 * Each heuristic matrix should already be normalized and scaled by its weight
 * The Sum Matrix is the element-wise sum, then normalized
 *
 * @param {Float64Array[]} crawlMatrix - Crawl heuristic 128x128 matrix
 * @param {Float64Array[]} vlMatrix - Voice Leading heuristic 128x128 matrix
 * @param {Float64Array[]} harmonicityMatrix - Harmonicity heuristic 128x128 matrix
 * @returns {Float64Array[]} Sum Matrix (128x128, normalized)
 */
export function computeSumMatrix(crawlMatrix, vlMatrix, harmonicityMatrix) {
  logDebug(CATEGORY, 'Computing Sum Matrix from heuristic matrices');

  // Sum the three matrices element-wise
  const sumMatrix = addMatricesUtil([crawlMatrix, vlMatrix, harmonicityMatrix]);

  // Normalize the result
  normalizeMatrix(sumMatrix);

  return sumMatrix;
}

/**
 * Convert a Sum Matrix to a probability vector by multiplying with a projection vector
 * This implements: P(A) = sum over B of P(A|B) * projection(B)
 *
 * @param {Float64Array[]} sumMatrix - The 128x128 Sum Matrix
 * @param {number[]} projectionVector - Size-128 projection mask (rank.projected_series)
 * @returns {Float64Array} Size-128 probability vector, normalized
 */
export function sumMatrixToVector(sumMatrix, projectionVector) {
  logDebug(CATEGORY, 'Converting Sum Matrix to probability vector');

  // Multiply matrix by projection vector
  const resultVector = matrixVectorMultiply(sumMatrix, projectionVector);

  // Normalize the result
  const normalizedVector = normalizeVectorFromMatrix(resultVector);

  return normalizedVector;
}

export default {
  createUniformVector,
  createZeroVector,
  normalizeVector,
  multiplyVectors,
  applyMask,
  sampleFromDistribution,
  getMaxProbabilityNote,
  addVectors,
  scaleVector,
  computeSumMatrix,
  sumMatrixToVector
};
