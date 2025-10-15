"use client";

import React, { useState } from "react";
import {
  Card,
  Box,
  Typography,
  Menu,
  IconButton,
  MenuItem,
  Grid,
  Button,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

const sellersData = [
  {
    id: 1,
    name: "Ava Turner",
    email: "turner@trezo.com",
    image: "/images/sellers/seller1.png",
    lastSaleDate: "25 Nov 2024",
    itemStock: 50,
    walletBalance: "$9,999.50",
    revenue: "$5,999.50",
    store: "TechMaster Store",
  },
  {
    id: 2,
    name: "Ethan Parker",
    email: "ethan@trezo.com",
    image: "/images/sellers/seller2.png",
    lastSaleDate: "1 Nov 2024",
    itemStock: 39,
    walletBalance: "$6,756.50",
    revenue: "$4,645.50",
    store: "RisionTech Outlet",
  },
  {
    id: 3,
    name: "Liam Johnson",
    email: "liam@trezo.com",
    image: "/images/sellers/seller3.png",
    lastSaleDate: "15 Oct 2024",
    itemStock: 28,
    walletBalance: "$4,250.00",
    revenue: "$3,120.00",
    store: "Gadget Galaxy",
  },
  {
    id: 4,
    name: "Olivia Brown",
    email: "olivia@trezo.com",
    image: "/images/sellers/seller4.png",
    lastSaleDate: "05 Sep 2024",
    itemStock: 34,
    walletBalance: "$7,800.00",
    revenue: "$5,500.00",
    store: "Modern Tech",
  },
  {
    id: 5,
    name: "Noah Davis",
    email: "noah@trezo.com",
    image: "/images/sellers/seller5.png",
    lastSaleDate: "20 Aug 2024",
    itemStock: 42,
    walletBalance: "$8,150.00",
    revenue: "$6,200.00",
    store: "Electro Hub",
  },
  {
    id: 6,
    name: "Emma Miller",
    email: "emma@trezo.com",
    image: "/images/sellers/seller6.png",
    lastSaleDate: "30 Jul 2024",
    itemStock: 27,
    walletBalance: "$5,600.00",
    revenue: "$3,750.00",
    store: "Digital Den",
  },
  {
    id: 7,
    name: "William Wilson",
    email: "william@trezo.com",
    image: "/images/sellers/seller7.png",
    lastSaleDate: "12 Jul 2024",
    itemStock: 55,
    walletBalance: "$10,500.00",
    revenue: "$7,300.00",
    store: "Techie Town",
  },
  {
    id: 8,
    name: "Sophia Martinez",
    email: "sophia@trezo.com",
    image: "/images/sellers/seller8.png",
    lastSaleDate: "22 Jun 2024",
    itemStock: 31,
    walletBalance: "$6,200.00",
    revenue: "$4,100.00",
    store: "Gizmo Central",
  },
  {
    id: 9,
    name: "James Anderson",
    email: "james@trezo.com",
    image: "/images/sellers/seller9.png",
    lastSaleDate: "10 Jun 2024",
    itemStock: 47,
    walletBalance: "$9,000.00",
    revenue: "$6,400.00",
    store: "Innovatech",
  },
  {
    id: 10,
    name: "Isabella Thomas",
    email: "isabella@trezo.com",
    image: "/images/sellers/seller10.png",
    lastSaleDate: "05 Jun 2024",
    itemStock: 38,
    walletBalance: "$7,250.00",
    revenue: "$5,100.00",
    store: "Future Tech",
  },
  {
    id: 11,
    name: "Benjamin Taylor",
    email: "benjamin@trezo.com",
    image: "/images/sellers/seller11.png",
    lastSaleDate: "28 May 2024",
    itemStock: 40,
    walletBalance: "$8,300.00",
    revenue: "$5,950.00",
    store: "Cyber Store",
  },
  {
    id: 12,
    name: "Mia Lee",
    email: "mia@trezo.com",
    image: "/images/sellers/seller12.png",
    lastSaleDate: "15 May 2024",
    itemStock: 36,
    walletBalance: "$7,100.00",
    revenue: "$4,900.00",
    store: "Smart Solutions",
  },
  {
    id: 13,
    name: "Alexander Harris",
    email: "alexander@trezo.com",
    image: "/images/sellers/seller1.png",
    lastSaleDate: "01 May 2024",
    itemStock: 29,
    walletBalance: "$6,000.00",
    revenue: "$4,350.00",
    store: "Tech Emporium",
  },
  {
    id: 14,
    name: "Charlotte Clark",
    email: "charlotte@trezo.com",
    image: "/images/sellers/seller2.png",
    lastSaleDate: "20 Apr 2024",
    itemStock: 33,
    walletBalance: "$7,800.00",
    revenue: "$5,250.00",
    store: "Gadget Garage",
  },
  {
    id: 15,
    name: "Daniel Rodriguez",
    email: "daniel@trezo.com",
    image: "/images/sellers/seller3.png",
    lastSaleDate: "05 Apr 2024",
    itemStock: 44,
    walletBalance: "$9,400.00",
    revenue: "$6,850.00",
    store: "Innovative Tech",
  },
  {
    id: 16,
    name: "Amelia Lewis",
    email: "amelia@trezo.com",
    image: "/images/sellers/seller4.png",
    lastSaleDate: "25 Mar 2024",
    itemStock: 30,
    walletBalance: "$6,750.00",
    revenue: "$4,800.00",
    store: "Digital Depot",
  },
  {
    id: 17,
    name: "Matthew Walker",
    email: "matthew@trezo.com",
    image: "/images/sellers/seller5.png",
    lastSaleDate: "10 Mar 2024",
    itemStock: 50,
    walletBalance: "$9,100.00",
    revenue: "$6,500.00",
    store: "Tech Bazaar",
  },
  {
    id: 18,
    name: "Harper Hall",
    email: "harper@trezo.com",
    image: "/images/sellers/seller6.png",
    lastSaleDate: "28 Feb 2024",
    itemStock: 35,
    walletBalance: "$7,500.00",
    revenue: "$5,200.00",
    store: "Gizmo Gallery",
  },
  {
    id: 19,
    name: "Joseph Allen",
    email: "joseph@trezo.com",
    image: "/images/sellers/seller7.png",
    lastSaleDate: "15 Feb 2024",
    itemStock: 41,
    walletBalance: "$8,800.00",
    revenue: "$6,100.00",
    store: "Electro Mart",
  },
  {
    id: 20,
    name: "Evelyn Young",
    email: "evelyn@trezo.com",
    image: "/images/sellers/seller8.png",
    lastSaleDate: "05 Feb 2024",
    itemStock: 32,
    walletBalance: "$7,200.00",
    revenue: "$5,000.00",
    store: "Tech Corner",
  },
];

const SellersContent: React.FC = () => {
  // Dropdown
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filter sellers based on searchQuery
  const filteredSellers = sellersData.filter(
    (seller) =>
      seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedSellers = filteredSellers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle previous and next
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <>
      <Card
        sx={{
          boxShadow: "none",
          borderRadius: "7px",
          mb: "25px",
          padding: { xs: "18px", sm: "20px", lg: "25px" },
          display: { sm: "flex" },
          alignItems: "center",
          justifyContent: "space-between",
        }}
        className="rmui-card"
      >
        <Box>
          <Box
            component="form"
            className="t-search-form"
            sx={{
              width: { sm: "265px" },
            }}
          >
            <label>
              <i className="material-symbols-outlined">search</i>
            </label>
            <input
              type="text"
              className="t-input"
              placeholder="Search here..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // reset to first page when search changes
              }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: { xs: "10px", sm: "0" } }}>
          <Link href="/ecommerce/sellers/create">
            <Button
              variant="outlined"
              sx={{
                textTransform: "capitalize",
                borderRadius: "7px",
                fontWeight: "500",
                fontSize: "13px",
                padding: "6px 13px",
              }}
              color="primary"
            >
              <i className="material-symbols-outlined">add</i> Add New Seller
            </Button>
          </Link>
        </Box>
      </Card>

      <Grid container columnSpacing={{ xs: 1, sm: 2, md: 2, lg: 3 }}>
        {paginatedSellers.length > 0 ? (
          paginatedSellers.map((seller) => (
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 3 }} key={seller.id}>
              <Card
                sx={{
                  boxShadow: "none",
                  borderRadius: "7px",
                  padding: { xs: "18px", sm: "20px", lg: "25px" },
                  mb: "25px",
                }}
                className="rmui-card seller-card"
              >
                <Box
                  className="info d-flex align-items-center justify-content-between"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: "15px",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                    }}
                  >
                    <Box>
                      <Image
                        src={seller.image}
                        alt="seller-image"
                        width={50}
                        height={50}
                      />
                    </Box>
                    <Box>
                      <Link href="/ecommerce/sellers/details">
                        <Typography
                          variant="h6"
                          fontSize="16px"
                          className="text-black"
                        >
                          {seller.name}
                        </Typography>
                      </Link>

                      <Typography fontSize="13px">{seller.email}</Typography>
                    </Box>
                  </Box>

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
                          boxShadow: "0px 1px 7px #ddd",
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
                      <MenuItem>View</MenuItem>
                      <MenuItem>Edit</MenuItem>
                      <MenuItem>Delete</MenuItem>
                    </Menu>
                  </Box>
                </Box>

                <Box>
                  <Box className="text-black" mt="10px">
                    <span className="text-body mr-5">Last Sale Date:</span>
                    {seller.lastSaleDate}
                  </Box>

                  <Box className="text-black" mt="10px">
                    <span className="text-body mr-5">Item Stock:</span>
                    {seller.itemStock}
                  </Box>

                  <Box className="text-black" mt="10px">
                    <span className="text-body mr-5">Wallet Balance:</span>
                    {seller.walletBalance}
                  </Box>

                  <Box className="text-black" mt="10px">
                    <span className="text-body mr-5">Revenue:</span>
                    {seller.revenue}
                  </Box>

                  <Box className="text-black" mt="10px">
                    <span className="text-body mr-5">Store:</span>
                    {seller.store}
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography sx={{ textAlign: "center", width: "100%", mb: 3 }}>
            No sellers found.
          </Typography>
        )}

        {/* Pagination */}
        {filteredSellers.length > itemsPerPage && (
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
            <Card
              className="bg-white"
              sx={{ borderRadius: "7px", mb: "25px", boxShadow: "none" }}
            >
              <Box sx={{ padding: "24px" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: { xs: "center", sm: "space-between" },
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    component={"span"}
                    sx={{ fontSize: "12px", fontWeight: "500" }}
                  >
                    Showing {indexOfFirstItem + 1}-
                    {Math.min(indexOfLastItem, filteredSellers.length)} of{" "}
                    {filteredSellers.length} Results
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                    }}
                  >
                    <Box
                      className="border"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "30px",
                        height: "30px",
                        borderRadius: "5px",
                        cursor: "pointer",

                        "&:hover": {
                          backgroundColor: "primary.main",
                          color: "#fff !important",
                        },
                      }}
                      onClick={handlePrevPage}
                    >
                      <i className="material-symbols-outlined">
                        keyboard_arrow_left
                      </i>
                    </Box>

                    {Array.from({ length: totalPages }, (_, index) => (
                      <Box
                        key={index}
                        onClick={() => handlePageChange(index + 1)}
                        className={`border ${
                          currentPage === index + 1
                            ? "bg-primary text-white border-color-primary"
                            : ""
                        }`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "30px",
                          height: "30px",
                          borderRadius: "5px",
                          cursor: "pointer",

                          "&:hover": {
                            backgroundColor: "primary.main",
                            color: "#fff !important",
                          },
                        }}
                      >
                        {index + 1}
                      </Box>
                    ))}

                    <Box
                      className="border"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "30px",
                        height: "30px",
                        borderRadius: "5px",
                        cursor: "pointer",

                        "&:hover": {
                          backgroundColor: "primary.main",
                          color: "#fff !important",
                        },
                      }}
                      onClick={handleNextPage}
                    >
                      <i className="material-symbols-outlined">
                        keyboard_arrow_right
                      </i>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default SellersContent;
