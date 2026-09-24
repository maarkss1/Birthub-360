import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function LineChart() {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clear previous before re-render
    d3.select(chartRef.current).selectAll('*').remove();

    // Setup chart dimensions
    const width = chartRef.current.clientWidth;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Generate 30 days of deterministic, trend-based data with weekly periodicity
    const data = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(2026, 4, 30 - 29 + i);
      const dayOfWeek = date.getDay();
      const weeklyFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 12 : 38; // lower on weekends
      const calls = 15 + i + weeklyFactor + Math.round(Math.sin(i * 0.9) * 6);
      return { date, value: calls };
    });

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) as number + 20])
      .range([innerHeight, 0]);

    // X Axis
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%d/%m') as (domainValue: Date | d3.NumberValue, index: number) => string))
      .attr('color', '#94a3b8');

    // Y Axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .attr('color', '#94a3b8');

    // Remove domains (axis lines)
    svg.selectAll('.domain').remove();
    
    // Add grid lines
    svg.select('.y-axis')
    
    svg.selectAll('g.tick line').attr('stroke', '#f1f5f9');

    // Line Path generator
    const line = d3.line<{date: Date, value: number}>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Add line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Add Area under line
    const area = d3.area<{date: Date, value: number}>()
      .x(d => x(d.date))
      .y0(innerHeight)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Standard styling for gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'blue-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#2563eb')
      .attr('stop-opacity', 0.2);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#2563eb')
      .attr('stop-opacity', 0);

    svg.append('path')
      .datum(data)
      .attr('fill', 'url(#blue-gradient)')
      .attr('d', area);

    // Add points
    svg.selectAll('.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.value))
      .attr('r', 3)
      .attr('fill', '#fff')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2);

  }, []);

  return <div ref={chartRef} className="w-full h-[200px]" />;
}
