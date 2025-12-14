// FIBRIL Treemap Visualization Module
// Visualizes probability vectors from DBN algorithm using Chart.js treemap

const TreemapVisualizer = {
  charts: [],
  container: null,

  // Rank colors matching RANK_COLORS from constants
  RANK_COLORS: {
    tonic: 'rgba(255, 99, 132, 0.8)',       // Red (Rank 1)
    supertonic: 'rgba(255, 159, 64, 0.8)',  // Orange (Rank 2)
    mediant: 'rgba(255, 205, 86, 0.8)',     // Yellow (Rank 3)
    subdominant: 'rgba(75, 192, 192, 0.8)', // Teal (Rank 4)
    dominant: 'rgba(54, 162, 235, 0.8)',    // Blue (Rank 5)
    submediant: 'rgba(153, 102, 255, 0.8)'  // Purple (Rank 6)
  },

  // Scale degree semitone offsets from root
  SCALE_DEGREES: {
    tonic: 0,
    supertonic: 2,
    mediant: 4,
    subdominant: 5,
    dominant: 7,
    submediant: 9
  },

  init() {
    this.container = document.getElementById('treemap-container');
    if (!this.container) {
      console.error('Treemap container not found');
    }
  },

  // Clear existing treemaps
  clear() {
    this.charts.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  },

  // Render N treemaps from iteration data
  render(iterationDataArray) {
    this.clear();

    if (!iterationDataArray || iterationDataArray.length === 0) {
      return;
    }

    iterationDataArray.forEach((data, index) => {
      const canvas = this.createCanvas(index);
      const chartData = this.prepareChartData(data.probabilityVector, data.keycenter);

      if (chartData.length > 0) {
        const chart = this.createTreemap(canvas, chartData, data.rankId, data.iteration);
        this.charts.push(chart);
      }
    });
  },

  createCanvas(index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'treemap-wrapper';

    const canvas = document.createElement('canvas');
    canvas.id = `treemap-${index}`;
    wrapper.appendChild(canvas);
    this.container.appendChild(wrapper);

    return canvas;
  },

  prepareChartData(probabilityVector, keycenter) {
    // Get top 20 notes by probability
    const indexed = probabilityVector
      .map((prob, midi) => ({ midi, prob }))
      .filter(item => item.prob > 0)
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 20);

    return indexed.map(item => ({
      midi: item.midi,
      value: item.prob * 100, // Convert to percentage for better display
      color: this.getHarmonicityColor(item.midi, keycenter),
      noteName: this.midiToNoteName(item.midi)
    }));
  },

  midiToNoteName(midi) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = noteNames[midi % 12];
    return `${note}${octave}`;
  },

  // Calculate which harmonic functions a note belongs to
  getHarmonicMemberships(midi, keycenter) {
    const pitchClass = midi % 12;
    const rootPC = keycenter % 12;
    const memberships = [];

    // For each scale degree, check if this note is:
    // 1. The root of that scale degree
    // 2. A perfect 4th above that scale degree
    // 3. A perfect 5th above that scale degree

    const scaleDegrees = ['tonic', 'subdominant', 'dominant'];
    const degreeRoots = {
      tonic: rootPC,
      subdominant: (rootPC + 5) % 12,  // P4 above tonic
      dominant: (rootPC + 7) % 12       // P5 above tonic
    };

    for (const degree of scaleDegrees) {
      const degreeRoot = degreeRoots[degree];

      // Is this note the root of this degree?
      if (pitchClass === degreeRoot) {
        memberships.push({ degree, relation: 'root' });
      }
      // Is this note a P4 above this degree's root?
      else if (pitchClass === (degreeRoot + 5) % 12) {
        memberships.push({ degree, relation: 'P4' });
      }
      // Is this note a P5 above this degree's root?
      else if (pitchClass === (degreeRoot + 7) % 12) {
        memberships.push({ degree, relation: 'P5' });
      }
    }

    return memberships;
  },

  getHarmonicityColor(midi, keycenter) {
    const memberships = this.getHarmonicMemberships(midi, keycenter);

    if (memberships.length === 0) {
      return 'rgba(128, 128, 128, 0.5)'; // Gray for non-harmonic notes
    }

    if (memberships.length === 1) {
      return this.RANK_COLORS[memberships[0].degree] || 'rgba(128, 128, 128, 0.5)';
    }

    // For multiple memberships, return the first (most important) color
    // The striped pattern will be handled via CSS/canvas pattern
    return this.RANK_COLORS[memberships[0].degree] || 'rgba(128, 128, 128, 0.5)';
  },

  // Create striped pattern for multi-membership cells
  createStripedPattern(ctx, memberships) {
    if (memberships.length <= 1) return null;

    const patternCanvas = document.createElement('canvas');
    const patternCtx = patternCanvas.getContext('2d');
    const stripeWidth = 10;
    patternCanvas.width = stripeWidth * memberships.length;
    patternCanvas.height = stripeWidth * memberships.length;

    memberships.forEach((membership, i) => {
      patternCtx.fillStyle = this.RANK_COLORS[membership.degree];
      // Draw diagonal stripes
      patternCtx.beginPath();
      patternCtx.moveTo(i * stripeWidth, 0);
      patternCtx.lineTo((i + 1) * stripeWidth, 0);
      patternCtx.lineTo(patternCanvas.width, patternCanvas.height - (i + 1) * stripeWidth);
      patternCtx.lineTo(patternCanvas.width, patternCanvas.height - i * stripeWidth);
      patternCtx.closePath();
      patternCtx.fill();

      patternCtx.beginPath();
      patternCtx.moveTo(0, patternCanvas.height - (i + 1) * stripeWidth);
      patternCtx.lineTo(0, patternCanvas.height - i * stripeWidth);
      patternCtx.lineTo((i + 1) * stripeWidth, patternCanvas.height);
      patternCtx.lineTo(i * stripeWidth, patternCanvas.height);
      patternCtx.closePath();
      patternCtx.fill();
    });

    return ctx.createPattern(patternCanvas, 'repeat');
  },

  createTreemap(canvas, data, rankId, iteration) {
    const ctx = canvas.getContext('2d');

    // Pre-calculate patterns for striped cells
    const keycenter = data[0]?.keycenter || 60;

    return new Chart(ctx, {
      type: 'treemap',
      data: {
        datasets: [{
          tree: data,
          key: 'value',
          groups: ['midi'],
          spacing: 1,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          backgroundColor: (ctx) => {
            if (ctx.raw) {
              return ctx.raw.color;
            }
            return 'rgba(128, 128, 128, 0.5)';
          },
          labels: {
            display: true,
            align: 'center',
            position: 'middle',
            color: 'white',
            font: {
              size: 11,
              weight: 'bold'
            },
            formatter: (ctx) => {
              if (ctx.raw && ctx.raw.midi !== undefined) {
                return ctx.raw.midi.toString();
              }
              return '';
            }
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: `Rank ${rankId}`,
            color: '#e0e0e0',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (items) => {
                if (items[0]?.raw) {
                  const raw = items[0].raw;
                  return `MIDI ${raw.midi} (${raw.noteName || ''})`;
                }
                return '';
              },
              label: (item) => {
                if (item.raw) {
                  return `Probability: ${item.raw.value.toFixed(1)}%`;
                }
                return '';
              }
            }
          }
        }
      }
    });
  }
};

// Make available globally
window.TreemapVisualizer = TreemapVisualizer;
