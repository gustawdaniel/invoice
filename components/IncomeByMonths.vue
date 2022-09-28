<template>
  <Bar
      class="h-30"
      :chart-options="chartOptions"
      :chart-data="chartData"
      :chart-id="chartId"
      :plugins="plugins"
      :css-classes="cssClasses"
      :styles="styles"
      :width="width"
      :height="height"
  />
</template>

<script setup lang="ts">
import {Bar} from 'vue-chartjs'

import {defineComponent, h, PropType} from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PluginOptionsByType,
  Plugin
} from 'chart.js'
import dayjs from "dayjs";
import {invoices} from "~/store";
import {total} from "~/helpers/total";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  chartId: {
    type: String,
    default: 'bar-chart'
  },
  width: {
    type: Number,
    default: 400
  },
  height: {
    type: Number,
    default: 100
  },
  cssClasses: {
    default: '',
    type: String
  },
  styles: {
    type: Object as PropType<Partial<CSSStyleDeclaration>>,
    default: () => {
    }
  },
  plugins: {
    type: Array as PropType<Plugin<'bar'>[]>,
    default: () => []
  }
})

function valueOfInvoicesAgo(monthsAgo, wasPaid): number {
  const datePrefix = dayjs().subtract(monthsAgo, 'month').format('YYYY-MM');
  const selectedInvoices = invoices.value.filter(inv => inv.issueDate.startsWith(datePrefix));
  if (wasPaid) {
    console.log("valueOfInvoicesAgo(monthsAgo, wasPaid)", monthsAgo, wasPaid, selectedInvoices);
    return selectedInvoices.reduce((p, n) => {
      return p + (Number.isFinite(n.paid) ? n.paid : 0)
    }, 0)
  } else {
    return selectedInvoices.reduce((p, n) => {
      console.log(monthsAgo, wasPaid, p, total(n), (Number.isFinite(n.paid) ? n.paid : 0));
      return p + total(n) - (Number.isFinite(n.paid) ? n.paid : 0)
    }, 0)
  }
}

const monthsAgo = 5;

console.log("all", [...new Array(monthsAgo)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i, false)));


const chartData = {
  labels: [...new Array(monthsAgo)].map((e, i, a) => dayjs().subtract(a.length - 1 - i, 'months').format('MMMM')),
  datasets: [
    {
      data: [...new Array(monthsAgo)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i, true)),
      label: 'Paid',
      backgroundColor: '#27AE60'
    },
    {
      data: [...new Array(monthsAgo)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i, false)),
      label: 'Waiting',
      backgroundColor: '#F4D03F'
    }
  ]
}

const chartOptions = {
  responsive: true, scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true
    }
  }
}

const chartId = props.chartId;
const width = props.width;
const height = props.height;
const cssClasses = props.cssClasses;
const styles = props.styles;
const plugins = props.plugins;


</script>

<style scoped>

</style>
