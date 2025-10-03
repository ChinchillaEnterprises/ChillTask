"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import WorldMapContent from "./WorldMapContent";

const countriesData = [
  { name: "United States", flag: "usa.svg", percentage: 85 },
  { name: "Germany", flag: "germany.svg", percentage: 75 },
  { name: "United Kingdom", flag: "uk.svg", percentage: 40 },
  { name: "Canada", flag: "canada.svg", percentage: 10 },
  { name: "Portugal", flag: "portugal.svg", percentage: 5 },
  { name: "Spain", flag: "spain.svg", percentage: 15 },
];

const Content = () => {
  return (
    <>
      <Box>
        <WorldMapContent />

        <Box>
          {countriesData.map((country, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                mt: "7px",
                gap: "15px",
              }}
            >
              <Box
                sx={{
                  flexShrink: "0",
                }}
              >
                <Image
                  src={`/images/flags/${country.flag}`}
                  alt={country.name}
                  width={32}
                  height={32}
                />
              </Box>

              <Box sx={{ flexGrow: "1" }}>
                <Typography component="span" sx={{ fontWeight: "500" }}>
                  {country.name}
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
                        bgcolor: "#605dff",
                        width: `${country.percentage}%`,
                        height: "4px",
                        borderRadius: "30px",
                      }}
                    ></Box>
                  </Box>

                  <Typography component="span">
                    {country.percentage}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
};

export default Content;
