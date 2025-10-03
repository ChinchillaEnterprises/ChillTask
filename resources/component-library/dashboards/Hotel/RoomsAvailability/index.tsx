"use client";

import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Box, Typography, Card } from "@mui/material";
import CustomDropdown from "./CustomDropdown";

// Dynamically import react-apexcharts with Next.js dynamic import
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface RoomAvailabilityData {
  bookedPercentage: number;
  availablePercentage: number;
  labels: string[];
  colors: string[];
  timeRange: string;
}

const RoomsAvailability = () => {
  // Chart state
  const [isChartLoaded, setChartLoaded] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("Daily");
  const [roomData, setRoomData] = useState<RoomAvailabilityData>({
    bookedPercentage: 72.5,
    availablePercentage: 27.5,
    labels: ["Total Booked"],
    colors: ["#37D80A"],
    timeRange: "Daily",
  });

  useEffect(() => {
    setChartLoaded(true);
    // In a real app, you might fetch data here based on timeRange
    updateChartData(timeRange);
  }, [timeRange]);

  const updateChartData = (range: string) => {
    // Simulate different data based on time range selection
    const dataMap: Record<string, RoomAvailabilityData> = {
      Daily: {
        bookedPercentage: 72.5,
        availablePercentage: 27.5,
        labels: ["Total Booked"],
        colors: ["#37D80A"],
        timeRange: "Daily",
      },
      Weekly: {
        bookedPercentage: 65.3,
        availablePercentage: 34.7,
        labels: ["Weekly Booked"],
        colors: ["#FFA500"],
        timeRange: "Weekly",
      },
      Monthly: {
        bookedPercentage: 58.2,
        availablePercentage: 41.8,
        labels: ["Monthly Booked"],
        colors: ["#4169E1"],
        timeRange: "Monthly",
      },
      Yearly: {
        bookedPercentage: 81.4,
        availablePercentage: 18.6,
        labels: ["Yearly Booked"],
        colors: ["#800080"],
        timeRange: "Yearly",
      },
    };

    setRoomData(dataMap[range] || dataMap.Daily);
  };

  const options: ApexOptions = {
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        dataLabels: {
          name: {
            offsetY: -10,
            fontSize: "14px",
            color: "#64748B",
            fontWeight: "400",
          },
          value: {
            fontSize: "36px",
            color: "#3A4252",
            fontWeight: "700",
            formatter: function (val: any) {
              return val + "%";
            },
          },
        },
        track: {
          background: "#EEFFE5",
        },
      },
    },
    colors: roomData.colors,
    labels: roomData.labels,
    stroke: {
      dashArray: 7,
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
            flexWrap: "wrap",
            gap: "15px",
            mb: "10px",
            position: "relative",
            zIndex: 1,
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
            Rooms Availabiliity
          </Typography>

          <CustomDropdown
            options={["Daily", "Weekly", "Monthly", "Yearly"]}
            onSelect={(value) => setTimeRange(value)}
            defaultLabel={timeRange}
          />
        </Box>

        <Box sx={{ mt: "-40px" }}>
          {isChartLoaded && (
            <Chart
              options={options}
              series={[roomData.bookedPercentage]}
              type="radialBar"
              height={395}
              width={"100%"}
            />
          )}
        </Box>
      </Card>
    </>
  );
};

export default RoomsAvailability;
