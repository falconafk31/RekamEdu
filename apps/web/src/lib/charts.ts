// Pendaftaran Chart.js dipisah ke modul sendiri agar chunk vendor-chart
// dapat di-lazy-load: dashboard dapat ter-render lebih dulu, grafik
// menyusul sesaat kemudian saat chunk selesai dimuat (code-splitting).
import { Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale,
  PointElement, LineElement, Filler,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)
ChartJS.defaults.font.family = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#64748b'

export { Doughnut, Line }

export interface BarChartInput {
  labels: string[]
  values: number[]
  datasetLabel?: string
  barColor?: string
}

/**
 * Membuat Bar chart Chart.js pada sebuah <canvas>.
 * Mengembalikan fungsi cleanup (chart.destroy) untuk dipanggil saat unmount.
 */
export function mountBarChart(
  el: HTMLCanvasElement | null | undefined,
  input: BarChartInput,
): () => void {
  if (!el) return () => {}
  const chart = new ChartJS(el, {
    type: 'bar',
    data: {
      labels: input.labels,
      datasets: [
        {
          label: input.datasetLabel ?? '',
          data: input.values,
          backgroundColor: input.barColor ?? '#047857',
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {} },
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { ticks: { maxRotation: 45 } },
      },
    },
  })
  return () => chart.destroy()
}
