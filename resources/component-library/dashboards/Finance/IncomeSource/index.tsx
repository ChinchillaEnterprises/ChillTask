"use client";

import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Box, Typography, Card } from "@mui/material";

// Dynamically import react-apexcharts with Next.js dynamic import
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const IncomeSource: React.FC = () => {
  // Chart state
  const [isChartLoaded, setChartLoaded] = useState<boolean>(false);

  useEffect(() => {
    setChartLoaded(true);
  }, []);

  const series = [42, 47, 52, 58];

  const options: ApexOptions = {
    labels: ["$95k", "$60k", "$45k", "$22k"],
    fill: {
      opacity: 1,
    },
    stroke: {
      width: 0,
    },
    tooltip: {
      enabled: true,
      custom: function ({
        series,
        seriesIndex,
        w,
      }: {
        series: number[];
        seriesIndex: number;
        w: any; // w has a complex type, use 'any' or detailed type if needed
      }): string {
        let category = w.globals.labels[seriesIndex];
        let value = series[seriesIndex];
        let percentage = (
          (value / w.globals.series.reduce((a: number, b: number) => a + b, 0)) *
          100
        ).toFixed(2);
        return `<div style="padding: 10px; font-size: 13px; color: #333333; background: #ffffff; border-radius: 5px; box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);">
              <strong>${category}</strong><br/>
              Value: $${value}K<br/>
              Contribution: ${percentage}%
          </div>`;
      },
    },
    legend: {
      show: true,
      position: "left",
      fontSize: "12px", 
      offsetX: -24,
      offsetY: 15,
      customLegendItems: [
        "Product Sales",
        "Investments",
        "Salary",
        "Consulting",
      ],
      itemMargin: {
        horizontal: 0,
        vertical: 5,
      },
      labels: {
        colors: "#ECEEF2",
      },
      markers: {
        size: 6,
        offsetX: -2,
        offsetY: 0.5,
        shape: "square",
      },
    },
    plotOptions: {
      polarArea: {
        rings: {
          strokeWidth: 0,
        },
        spokes: {
          strokeWidth: 0,
        },
      },
    },
    theme: {
      monochrome: {
        enabled: true,
        shadeTo: "light",
        shadeIntensity: 0.6,
      },
    },
    dataLabels: {
      enabled: false,
      style: {
        fontSize: "11px",
      },
      dropShadow: {
        enabled: false,
      },
      formatter: function (val: number, opts: any): string {
        return opts.w.globals.labels[opts.seriesIndex];
      },
      background: {
        padding: 5,
        opacity: 1,
        foreColor: "#ffffff",
        borderWidth: 0,
      },
    },
  };

  return (
    <>
      <Card
        sx={{
          boxShadow: "none",
          borderRadius: "7px",
          mb: "25px",
          padding: { xs: "18px", sm: "20px", lg: "25px" },
        }}
        className="rmui-card"
        style={{
          background: "linear-gradient(120deg, #343A46 0%, #23272E 99.29%)",
        }}
      >
        <Box
          sx={{
            mb: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: "0",
              fontSize: "20px",
              fontWeight: "700",
              color: "#fff !important",
            }}
          >
            Income Source
          </Typography>

          <Box>
            <Typography sx={{ color: "#fff !important" }}>
              Last 30 days
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mt: "10px",
          }}
        >
          {isChartLoaded && (
            <Chart
              options={options}
              series={series}
              type="polarArea"
              height={230}
              width={'100%'}
            />
          )}
        </Box>
      </Card>
    </>
  );
};

export default IncomeSource;
