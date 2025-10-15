"use client";

import React from "react";
import {
  Card,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

interface Transaction {
  icon: string;
  name: string;
  date: string;
  amount: string;
  colorVariant: string; // e.g., "primary", "error", "purple", "secondary", "success"
}

const transactions: Transaction[] = [
  {
    icon: "credit_card",
    name: "Master Card",
    date: "16 Jun 2024 - 7:12 pm",
    amount: "+1,520",
    colorVariant: "primary",
  },
  {
    icon: "redeem",
    name: "Paypal",
    date: "15 Jun 2024 - 1:42 am",
    amount: "-2,250",
    colorVariant: "error",
  },
  {
    icon: "account_balance",
    name: "Wise",
    date: "14 Jun 2024 - 4:21 pm",
    amount: "+3,560",
    colorVariant: "purple",
  },
  {
    icon: "currency_ruble",
    name: "Payoneer",
    date: "13 Jun 2024 - 2:42 am",
    amount: "+6,500",
    colorVariant: "secondary",
  },
  {
    icon: "credit_score",
    name: "Credit Card",
    date: "12 Jun 2024 - 3:20 pm",
    amount: "-4,320",
    colorVariant: "success",
  },
];

const RecentTransactions: React.FC = () => {
  // Dropdown
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
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
            Recent Transactions
          </Typography>

          <Box>
            <IconButton
              onClick={handleClick}
              size="small"
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              <MoreHorizIcon sx={{ fontSize: "25px" }} />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              PaperProps={{
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
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem>This Day</MenuItem>
              <MenuItem>This Week</MenuItem>
              <MenuItem>This Month</MenuItem>
              <MenuItem>This Year</MenuItem>
            </Menu>
          </Box>
        </Box>

        <Box>
          {transactions.map((transaction, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "20px",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <Box
                  sx={{
                    bgcolor: `${transaction.colorVariant}.100`,
                    color: `${transaction.colorVariant}.main`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "100px",
                    width: "41px",
                    height: "41px",
                  }}
                >
                  <i className="material-symbols-outlined">
                    {transaction.icon}
                  </i>
                </Box>

                <Box>
                  <Typography
                    className="text-black"
                    component="div"
                    sx={{
                      fontWeight: "500",
                      fontSize: "16px",
                    }}
                  >
                    {transaction.name}
                  </Typography>

                  <Typography
                    component="span"
                    sx={{ fontSize: "13px", display: "block" }}
                  >
                    {transaction.date}
                  </Typography>
                </Box>
              </Box>

              <Typography
                component="span"
                className={
                  transaction.amount.startsWith("+")
                    ? "text-success"
                    : "text-danger"
                }
              >
                {transaction.amount}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>
    </>
  );
};

export default RecentTransactions;
