"use client";

import * as React from "react";
import NextLink from "next/link";
import Image from "next/image";
import {
  Grid,
  Box,
  Button,
  Typography,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
} from "@mui/material";
import Select, { SelectChangeEvent } from "@mui/material/Select";

// Define a Product type for type safety
interface Product {
  id: number;
  title: string;
  viewDetails: string;
  image: string;
  price: string;
  oldPrice: string;
  rating: number;
}

// Sample product data (can be fetched dynamically)
const initialProducts: Product[] = [
  {
    id: 1,
    title: 'Apple MacBook Pro 16.2" with M3 Pro Chip',
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product6.jpg",
    price: "$3479",
    oldPrice: "$3599",
    rating: 4.5,
  },
  {
    id: 2,
    title: "SAMSUNG Galaxy Tab A9+ Tablet 11”",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product7.jpg",
    price: "$549",
    oldPrice: "$649",
    rating: 4.0,
  },
  {
    id: 3,
    title: "Apple iPhone 15 Pro Max (512 GB)",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product8.jpg",
    price: "$1479",
    oldPrice: "$1599",
    rating: 4.2,
  },
  {
    id: 4,
    title: "Gildan Men's Crew T-Shirts, Multipack",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product9.jpg",
    price: "$79",
    oldPrice: "$89",
    rating: 3.8,
  },
  {
    id: 5,
    title: "SOJOS Small Round Polarized Sunglasses",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product10.jpg",
    price: "$49",
    oldPrice: "$69",
    rating: 4.7,
  },
  {
    id: 6,
    title: "Skechers Men's Summits High Range",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product11.jpg",
    price: "$849",
    oldPrice: "$999",
    rating: 4.3,
  },
  {
    id: 7,
    title: "Amazfit GTR 3 Smart Watch for Men",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product12.jpg",
    price: "$39",
    oldPrice: "$69",
    rating: 4.0,
  },
  {
    id: 8,
    title: "Carhartt, Durable, Adjustable Crossbody Bag",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product13.jpg",
    price: "$149",
    oldPrice: "$299",
    rating: 4.5,
  },
  {
    id: 9,
    title: "Nautical Clock Ship Table Clock Brass Desk",
    viewDetails: "/ecommerce/products-list/details",
    image: "/images/products/product14.jpg",
    price: "$25",
    oldPrice: "$39",
    rating: 4.1,
  },
];

const ProductsGrid: React.FC = () => {
  // Select
  const [select, setSelect] = React.useState("");
  const handleChange = (event: SelectChangeEvent) => {
    setSelect(event.target.value as string);
  };

  // State for dynamic search
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(6); // Adjust as needed

  // Filter products based on the search query (case-insensitive)
  const filteredProducts = initialProducts.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Function to render stars based on rating value
  const renderRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    const totalStars = 5;
    const emptyStars = totalStars - fullStars - (hasHalfStar ? 1 : 0);

    const stars = [];
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <i
          key={`full-${i}`}
          className="ri-star-fill"
          style={{ color: "#fe7a36" }}
        ></i>
      );
    }
    if (hasHalfStar) {
      stars.push(
        <i
          key="half"
          className="ri-star-half-fill"
          style={{ color: "#fe7a36" }}
        ></i>
      );
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <i
          key={`empty-${i}`}
          className="ri-star-line"
          style={{ color: "#fe7a36" }}
        ></i>
      );
    }
    return stars;
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
            display: { sm: "flex" },
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={500}
              fontSize={18}
              className="text-black"
              sx={{
                mb: { xs: "10px", sm: "0" },
              }}
            >
              Filter
            </Typography>
          </Box>

          <Box
            sx={{
              display: { sm: "flex" },
              alignItems: "center",
              gap: "20px",
            }}
          >
            <Box
              component="form"
              className="t-search-form"
              sx={{
                width: { sm: "265px" },
                mb: { xs: "10px", sm: "0" },
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
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>

            <FormControl
              sx={{ minWidth: { xs: "100%", sm: "130px" } }}
              size="small"
            >
              <InputLabel id="demo-select-small">Select</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={select}
                label="select"
                onChange={handleChange}
                className="select"
              >
                <MenuItem value={0}>Default Sorting</MenuItem>
                <MenuItem value={1}>Price Low to High</MenuItem>
                <MenuItem value={2}>Price High to Low</MenuItem>
                <MenuItem value={3}>Top Sales</MenuItem>
                <MenuItem value={4}>Newest Arrivals</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Card>

      <Grid container columnSpacing={{ xs: 1, sm: 2, md: 2, lg: 3 }}>
        {currentItems.map((product) => (
          <Grid key={product.id} size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 4 }}>
            <Box
              className="single-product-item"
              sx={{ mb: { xs: "30px", sm: "45px" } }}
            >
              <Box sx={{ position: "relative" }}>
                <NextLink
                  href={product.viewDetails}
                  style={{ display: "block" }}
                >
                  <Image
                    src={product.image}
                    className="border-radius"
                    alt="product-image"
                    width={714}
                    height={714}
                  />
                </NextLink>

                <Box
                  sx={{
                    position: "absolute",
                    right: "0",
                    bottom: "5px",
                    bgcolor: "#fff",
                    paddingTop: "5px",
                    paddingLeft: "5px",
                    borderRadius: "7px 0px 0px 0px",
                  }}
                >
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: "primary.main",
                      boxShadow: "none",
                      width: "60px",
                      height: "60px",
                      borderRadius: "7px",
                      padding: "0",
                      minWidth: "auto",
                    }}
                    className="text-white"
                  >
                    <i className="material-symbols-outlined">shopping_cart</i>
                  </Button>
                </Box>
              </Box>

              <Box mt="15px">
                <Typography variant="h6" className="text-black" mb="10px">
                  <NextLink
                    href={product.viewDetails}
                    className="text-black hover-text-color"
                    style={{ fontSize: "16px" }}
                  >
                    {product.title}
                  </NextLink>
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: "20px",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Typography
                      fontWeight="700"
                      fontSize="20px"
                      className="text-black"
                    >
                      {product.price}
                    </Typography>
                    <Typography fontSize="16px" className="text-body">
                      {product.oldPrice}
                    </Typography>
                  </Box>

                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "2px" }}
                  >
                    {renderRatingStars(product.rating)}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        ))}

        {/* If no products match the search query */}
        {filteredProducts.length === 0 && (
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" align="center">
                No products found.
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Pagination */}
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
                  {Math.min(indexOfLastItem, filteredProducts.length)} of{" "}
                  {filteredProducts.length} Results
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
                    onClick={handlePreviousPage}
                  >
                    <i className="material-symbols-outlined">
                      keyboard_arrow_left
                    </i>
                  </Box>

                  {Array.from({ length: totalPages }, (_, index) => (
                    <Box
                      key={index + 1}
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
                      onClick={() => handlePageChange(index + 1)}
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
      </Grid>
    </>
  );
};

export default ProductsGrid;
