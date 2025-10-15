"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  MenuProps,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

// Dynamically import react-apexcharts with Next.js dynamic import
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const SpendingBreakdown: React.FC = () => {
  // Dropdown state and handlers
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Chart loading state
  const [isChartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    setChartLoaded(true);
  }, []);

  // Chart data
  const series: number[] = [35, 25, 12, 10, 10, 8];
  const labels: string[] = [
    "Groceries",
    "Utilities",
    "Rent",
    "Entertainment",
    "Transportation",
    "Other",
  ];

  // Custom menu paper props
  const menuPaperProps: MenuProps["PaperProps"] = {
    elevation: 0,
    sx: {
      overflow: "visible",
      boxShadow: "0 4px 45px #0000001a",
      mt: 0,
      "& .MuiAvatar-root": {
        width: 32,
        height: 32,
        ml: -0.5,
        mr: 1,
      },
    },
  };

  // Chart options
  const options: ApexOptions = {
    labels: labels,
    colors: ["#37D80A", "#FE7A36", "#3584FC", "#FF4023", "#AD63F6", "#605DFF"],
    stroke: {
      width: 2,
      show: true,
      colors: ["#ffffff"],
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          labels: {
            show: true,
            name: {
              color: "#64748B",
            },
            value: {
              show: true,
              color: "#3A4252",
              fontSize: "28px",
              fontWeight: "600",
              formatter: (val: string | number, opts?: any) => {
                if (opts?.w?.globals?.seriesTotals) {
                  const total = opts.w.globals.seriesTotals.reduce(
                    (a: number, b: number) => a + b,
                    0
                  );
                  const percentage = ((Number(val) / total) * 100).toFixed(1);
                  return `${val}k (${percentage}%)`;
                }
                return `${val}k`;
              },
            },
            total: {
              show: true,
              color: "#64748B",
              formatter: (w: any) => {
                return `${w.globals.seriesTotals.reduce(
                  (a: number, b: number) => a + b,
                  0
                )}k`;
              },
            },
          },
        },
      },
    },
    legend: {
      show: true,
      fontSize: "12px",
      position: "left",
      fontFamily: "Inter",
      horizontalAlign: "center",
      itemMargin: {
        horizontal: 0,
        vertical: 7,
      },
      labels: {
        colors: "#64748B",
      },
      markers: {
        size: 7,
        offsetX: -2,
        offsetY: -0.5,
        shape: "diamond",
      },
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return `${val}%`;
        },
      },
    },
  };

  return (
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
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "16px", md: "18px" },
              fontWeight: 700,
            }}
            className="text-black"
          >
            Spending Breakdown
          </Typography>
        </Box>

        <Box>
          <IconButton
            onClick={handleClick}
            size="small"
            aria-controls={open ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            sx={{ padding: "0" }}
          >
            <MoreHorizIcon sx={{ fontSize: "25px" }} />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={menuPaperProps}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem onClick={handleClose}>This Day</MenuItem>
            <MenuItem onClick={handleClose}>This Week</MenuItem>
            <MenuItem onClick={handleClose}>This Month</MenuItem>
            <MenuItem onClick={handleClose}>This Year</MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box sx={{ mt: "-5px", mb: "-5px" }}>
        {isChartLoaded && (
          <Chart options={options} series={series} type="donut" height={284} />
        )}
      </Box>
    </Card>
  );
};

export default SpendingBreakdown;
