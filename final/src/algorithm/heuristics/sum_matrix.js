// Matrix Combination Utilities
// Helper functions for combining probability matrices

import { MIDI_MAX } from '../../utils/constants.js';
import { logDebug } from '../../utils/helpers/debug_log.js';

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

export default {
  createUniformVector,
  createZeroVector,
  normalizeVector,
  multiplyVectors,
  applyMask,
  sampleFromDistribution,
  getMaxProbabilityNote,
  addVectors,
  scaleVector
};
