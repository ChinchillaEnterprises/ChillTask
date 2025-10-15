"use client";

import React from "react";
import { Card, Box, Typography, Radio } from "@mui/material";

const StandaloneRadioButtons: React.FC = () => {
  const [selectedValue, setSelectedValue] = React.useState("a");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedValue(event.target.value);
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
        <Typography
          variant="h3"
          sx={{
            fontSize: { xs: "16px", md: "18px" },
            fontWeight: 700,
            mb: "25px",
          }}
          className="text-black"
        >
          Standalone Radio Buttons
        </Typography>

        <Box>
          <Radio
            checked={selectedValue === "a"}
            onChange={handleChange}
            value="a"
            name="radio-buttons"
            inputProps={{ "aria-label": "A" }}
            sx={{
              color: "primary.500",
              "&.Mui-checked": {
                color: "primary.main",
              },
            }}
          />
          <Radio
            checked={selectedValue === "b"}
            onChange={handleChange}
            value="b"
            name="radio-buttons"
            inputProps={{ "aria-label": "B" }}
            sx={{
              color: "primary.500",
              "&.Mui-checked": {
                color: "primary.main",
              },
            }}
          />
        </Box>
      </Card>
    </>
  );
};

export default StandaloneRadioButtons;
