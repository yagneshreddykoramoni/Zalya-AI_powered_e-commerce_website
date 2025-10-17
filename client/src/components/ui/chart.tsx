
import React from 'react';
import { Area, Bar, BarChart as RechartsBarChart, LineChart as RechartsLineChart, 
         Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         TooltipProps, AreaChart as RechartsAreaChart } from 'recharts';

// Common chart props
interface BaseChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
}

// A simple bar chart component
export const BarChart = ({ 
  data, 
  index, 
  categories, 
  colors = ["#8884d8"], 
  showLegend = true,
  valueFormatter = (value: number) => `${value}`
}: BaseChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={index} />
        <YAxis tickFormatter={valueFormatter} />
        <Tooltip formatter={(value: number) => [valueFormatter(value), ""]} />
        {categories.map((key, i) => (
          <Bar key={key} dataKey={key} fill={colors[i % colors.length]} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

// A line chart component
export const LineChart = ({ 
  data, 
  index, 
  categories, 
  colors = ["#8884d8"],
  showLegend = true,
  valueFormatter = (value: number) => `${value}`
}: BaseChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={index} />
        <YAxis tickFormatter={valueFormatter} />
        <Tooltip formatter={(value: number) => [valueFormatter(value), ""]} />
        {categories.map((key, i) => (
          <Line 
            key={key} 
            type="monotone" 
            dataKey={key} 
            stroke={colors[i % colors.length]} 
            activeDot={{ r: 8 }} 
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

// An area chart component
export const AreaChart = ({ 
  data, 
  index, 
  categories, 
  colors = ["#8884d8"],
  showLegend = true,
  valueFormatter = (value: number) => `${value}`
}: BaseChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={index} />
        <YAxis tickFormatter={valueFormatter} />
        <Tooltip formatter={(value: number) => [valueFormatter(value), ""]} />
        {categories.map((key, i) => (
          <Area 
            key={key} 
            type="monotone" 
            dataKey={key} 
            stroke={colors[i % colors.length]} 
            fill={colors[i % colors.length]} 
            fillOpacity={0.3}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};
