"use client";

import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Box, Typography } from "@mui/material";
import Image from "next/image";

// Dynamically import react-apexcharts with Next.js dynamic import
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const Ethereum: React.FC = () => {
  // Chart
  const [isChartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    setChartLoaded(true);
  }, []);

  const series = [
    {
      name: "Price",
      data: [90, 130, 140, 110, 120, 95, 85, 170],
    },
  ];

  const options: ApexOptions = {
    chart: {
      zoom: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "straight",
      width: 2,
    },
    colors: ["#AD63F6"],
    fill: {
      type: "gradient",
      gradient: {
        stops: [0, 90, 100],
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.9,
      },
    },
    xaxis: {
      categories: [
        "01 Jan",
        "02 Jan",
        "03 Jan",
        "04 Jan",
        "05 Jan",
        "06 Jan",
        "07 Jan",
        "08 Jan",
      ],
      axisTicks: {
        show: false,
        color: "#ECEEF2",
      },
      axisBorder: {
        show: false,
        color: "#ECEEF2",
      },
      labels: {
        show: false,
        style: {
          colors: "#8695AA",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      tickAmount: 5,
      show: false,
      max: 170,
      min: 0,
      labels: {
        show: true,
        style: {
          colors: "#64748B",
          fontSize: "12px",
        },
        formatter: (val: any) => {
          return "$" + val + "K";
        },
      },
      axisBorder: {
        show: true,
        color: "#ECEEF2",
      },
      axisTicks: {
        show: true,
        color: "#ECEEF2",
      },
    },
    grid: {
      show: false,
      borderColor: "#ECEEF2",
    },
    legend: {
      show: true,
      position: "top",
      fontSize: "12px",
      horizontalAlign: "center",
      itemMargin: {
        horizontal: 8,
        vertical: 0,
      },
      labels: {
        colors: "#64748B",
      },
      markers: {
        shape: 'diamond',
        offsetX: -2,
        offsetY: -0.5,
      },
    },
  };

  return (
    <>
      <Box
        sx={{
          bgcolor: "#faf5ff",
          borderRadius: "5px",
          padding: "23px",
        }}
        className="watchlist-card"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Image
            src="/images/watchlist/ethereum.svg"
            alt="ethereum"
            width={48}
            height={48}
            style={{
              borderRadius: "100px",
            }}
          />

          <Box>
            <Typography
              component="span"
              className="text-black"
              sx={{
                display: "block",
                textTransform: "uppercase",
                fontWeight: "500",
              }}
            >
              Ethereum{" "}
              <Typography
                component="span"
                sx={{ fontWeight: "400" }}
                className="text-body"
              >
                (ETH)
              </Typography>
            </Typography>

            <Typography
              component="h4"
              sx={{
                fontWeight: "600",
                fontSize: "20px",
                mt: "5px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              $1,750
              <Typography
                component="span"
                sx={{
                  color: "#1E8308",
                  fontWeight: "500",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <i
                  className="bx bx-trending-down"
                  style={{ fontSize: "20px" }}
                ></i>
                -1.2%
              </Typography>
            </Typography>
          </Box>
        </Box>

        <div
          style={{
            marginTop: "-20px",
            marginLeft: "-11px",
            marginBottom: "-20px",
          }}
        >
          {isChartLoaded && (
            <Chart
              options={options}
              series={series}
              type="area"
              height={120}
              width={"100%"}
            />
          )}
        </div>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box
            className="text-black"
            sx={{
              fontWeight: "600",
              fontSize: "12px",
            }}
          >
            <Typography
              component="span"
              sx={{
                display: "block",
                fontWeight: "500",
                fontSize: "12px",
                mb: "3px",
              }}
              className="text-body"
            >
              Market Cap:
            </Typography>
            $210B
          </Box>

          <Box
            className="text-black"
            sx={{
              fontWeight: "600",
              fontSize: "12px",
            }}
          >
            <Typography
              component="span"
              sx={{
                display: "block",
                fontWeight: "500",
                fontSize: "12px",
                mb: "3px",
              }}
              className="text-body"
            >
              Volume (24h):
            </Typography>
            $20B
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Ethereum;
