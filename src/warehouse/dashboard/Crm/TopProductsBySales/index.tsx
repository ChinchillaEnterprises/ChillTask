"use client";

import React from "react";
import { Card, Box, Typography } from "@mui/material";
import CustomDropdown from "./CustomDropdown";

interface Product {
  icon: string;
  name: string;
  company: string;
  sales: string;
  colorVariant: string;
}

const TopProductsBySales: React.FC = () => {
  const products: Product[] = [
    {
      icon: "smartphone",
      name: "Samsung Galaxy",
      company: "Samsung",
      sales: "$96,455",
      colorVariant: "primary",
    },
    {
      icon: "tap_and_play",
      name: "iPhone 15 Plus",
      company: "Apple inc.",
      sales: "$89,670",
      colorVariant: "purple",
    },
    {
      icon: "edgesensor_low",
      name: "Vivo V30",
      company: "Vivo Ltd.",
      sales: "$75,329",
      colorVariant: "error",
    },
    {
      icon: "watch",
      name: "Watch Series 7",
      company: "Apple",
      sales: "$98,256",
      colorVariant: "success",
    },
    {
      icon: "headphones",
      name: "Sony WF-SP800N",
      company: "Sony",
      sales: "$65,987",
      colorVariant: "primary",
    },
  ];

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
            mb: "20px",
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
            Top Products by Sales
          </Typography>

          <Box>
            <CustomDropdown
              options={["This Week", "This Month", "This Year"]} // Need to change the options also in CustomDropdown file
              onSelect={(value) => console.log(value)}
              defaultLabel="This Week"
            />
          </Box>
        </Box>

        <Box className="crm-sr-list">
          {products.slice(0, 5).map((product, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "12.8px",
                paddingTop: "12.8px",
              }}
              className="border-top"
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                <Box
                  sx={{
                    bgcolor: `${product.colorVariant}.100`,
                    color: `${product.colorVariant}.main`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    width: "48px",
                    height: "48px",
                  }}
                >
                  <i className="material-symbols-outlined">{product.icon}</i>
                </Box>

                <Box>
                  <Typography
                    variant="h6"
                    className="text-black"
                    fontWeight="500 !important"
                    fontSize="14px"
                  >
                    {product.name}
                  </Typography>

                  <Typography
                    component="span"
                    sx={{ fontSize: "13px", display: "block" }}
                  >
                    {product.company}
                  </Typography>
                </Box>
              </Box>

              <Typography
                component="div"
                color="success"
                fontWeight={500}
                className="text-black"
              >
                {product.sales}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>
    </>
  );
};

export default TopProductsBySales;
