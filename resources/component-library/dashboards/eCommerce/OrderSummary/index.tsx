"use client";

import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Card, Box, Typography } from "@mui/material";
import CustomDropdown from "./CustomDropdown";

// Dynamically import react-apexcharts with Next.js dynamic import
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Dynamic order data
const orders = [
  {
    id: 1,
    name: "Completed Order",
    percentage: 60,
    color: "#25B003",
  },
  {
    id: 2,
    name: "New Order",
    percentage: 30,
    color: "#605DFF",
  },
  {
    id: 3,
    name: "Pending Order",
    percentage: 10,
    color: "#AD63F6",
  },
];

const OrderSummary: React.FC = () => {
  // Chart
  const [isChartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    setChartLoaded(true);
  }, []);

  const series = [60, 30, 10];

  const options: ApexOptions = {
    labels: ["Completed", "New Order", "Pending"],
    colors: ["#37D80A", "#605DFF", "#AD63F6"],
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
        offsetX: -2,
        offsetY: -0.5,
        shape: "diamond",
      },
    },
    dataLabels: {
      enabled: false,
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
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: "25px",
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "16px", md: "18px" },
              fontWeight: 700,
            }}
            className="text-black"
          >
            Order Summary
          </Typography>

          <Box>
            <CustomDropdown
              options={["Weekly", "Monthly", "Yearly"]} // Need to change the options also in CustomDropdown file
              onSelect={(value) => console.log(value)}
              defaultLabel="Today"
            />
          </Box>
        </Box>

        <Box sx={{ mb: "-8px" }}>
          {isChartLoaded && (
            <Chart
              options={options}
              series={series}
              type="donut"
              height={300}
              width={"100%"}
            />
          )}
        </Box>

        <Box>
          {orders.map((order) => (
            <Box
              sx={{
                mt: "7px",
              }}
              key={order.id}
            >
              <Typography component="span" sx={{ fontWeight: "500" }}>
                {order.name}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "15px",
                }}
              >
                <Box
                  sx={{
                    bgcolor: "#ecf0ff",
                    width: "100%",
                    height: "4px",
                    display: "block",
                    borderRadius: "30px",
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: order.color,
                      width: `${order.percentage}%`,
                      height: "4px",
                      borderRadius: "30px",
                    }}
                  ></Box>
                </Box>

                <Typography component="span">{order.percentage}%</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Card>
    </>
  );
};

export default OrderSummary;
