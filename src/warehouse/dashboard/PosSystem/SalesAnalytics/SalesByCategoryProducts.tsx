"use client";

import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Box } from "@mui/material";

// Dynamically import react-apexcharts with Next.js dynamic import
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const SalesByCategoryProducts: React.FC = () => {
  const [isChartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    setChartLoaded(true);
  }, []);

  const series = [35000, 25000, 18000];

  const options: ApexOptions = {
    labels: ["Electronics", "Clothing", "Home Goods"],
    colors: ["#AD63F6", "#37D80A", "#3584FC"],
    plotOptions: {
      pie: {
        startAngle: -90,
        endAngle: 90,
        offsetY: 10,
      },
    },
    grid: {
      padding: {
        bottom: -80,
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => {
          return "$" + val / 1 + "";
        },
      },
    },
    stroke: {
      width: 2,
      show: true,
      colors: ["#ffffff"],
      lineCap: "round",
    },
  };

  return (
    <>
      <Box sx={{ margin: "-19px -15px -8px -23px" }}>
        {isChartLoaded && (
          <Chart
            options={options}
            series={series}
            type="donut"
            height={178}
            width={"100%"}
          />
        )}
      </Box>
    </>
  );
};

export default SalesByCategoryProducts;
