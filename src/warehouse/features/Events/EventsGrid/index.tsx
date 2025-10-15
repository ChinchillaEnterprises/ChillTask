"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Grid,
  Card,
  Box,
  Typography,
  AvatarGroup,
  Avatar,
} from "@mui/material";
import Link from "next/link";

interface EventData {
  id: number;
  image: string;
  price: string;
  title: string;
  description: string;
  avatarImages: string[];
  seatBooked: number;
  seatProgress: number; // as a percentage value (0-100)
  detailsUrl: string;
}

const eventsData: EventData[] = [
  {
    id: 1,
    image: "/images/events/event1.jpg",
    price: "$120",
    title: "Annual Conference 2024",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user6.jpg",
      "/images/users/user7.jpg",
      "/images/users/user8.jpg",
      "/images/users/user9.jpg",
      "/images/users/user10.jpg",
    ],
    seatBooked: 1156,
    seatProgress: 85,
    detailsUrl: "/events/details",
  },
  {
    id: 2,
    image: "/images/events/event2.jpg",
    price: "$59",
    title: "Leadership Summit 2024",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user11.jpg",
      "/images/users/user12.jpg",
      "/images/users/user13.jpg",
      "/images/users/user14.jpg",
    ],
    seatBooked: 556,
    seatProgress: 24,
    detailsUrl: "/events/details",
  },
  {
    id: 3,
    image: "/images/events/event3.jpg",
    price: "$123",
    title: "Product Launch Webinar",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user15.jpg",
      "/images/users/user16.jpg",
      "/images/users/user17.jpg",
    ],
    seatBooked: 356,
    seatProgress: 65,
    detailsUrl: "/events/details",
  },
  {
    id: 4,
    image: "/images/events/event4.jpg",
    price: "$89",
    title: "Tech Innovators Forum",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user18.jpg",
      "/images/users/user19.jpg",
      "/images/users/user20.jpg",
    ],
    seatBooked: 789,
    seatProgress: 72,
    detailsUrl: "/events/details",
  },
  {
    id: 5,
    image: "/images/events/event5.jpg",
    price: "$199",
    title: "Global Marketing Expo",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user21.jpg",
      "/images/users/user22.jpg",
      "/images/users/user23.jpg",
      "/images/users/user24.jpg",
    ],
    seatBooked: 1200,
    seatProgress: 90,
    detailsUrl: "/events/details",
  },
  {
    id: 6,
    image: "/images/events/event6.jpg",
    price: "$49",
    title: "Startup Pitch Night",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user25.jpg",
      "/images/users/user26.jpg",
      "/images/users/user27.jpg",
    ],
    seatBooked: 300,
    seatProgress: 50,
    detailsUrl: "/events/details",
  },
  {
    id: 7,
    image: "/images/events/event7.jpg",
    price: "$149",
    title: "AI & Machine Learning Workshop",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user28.jpg",
      "/images/users/user29.jpg",
      "/images/users/user30.jpg",
    ],
    seatBooked: 450,
    seatProgress: 60,
    detailsUrl: "/events/details",
  },
  {
    id: 8,
    image: "/images/events/event8.jpg",
    price: "$79",
    title: "Creative Design Conference",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user31.jpg",
      "/images/users/user32.jpg",
      "/images/users/user33.jpg",
    ],
    seatBooked: 600,
    seatProgress: 75,
    detailsUrl: "/events/details",
  },
  {
    id: 9,
    image: "/images/events/event9.jpg",
    price: "$99",
    title: "Digital Transformation Summit",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user34.jpg",
      "/images/users/user35.jpg",
      "/images/users/user36.jpg",
    ],
    seatBooked: 850,
    seatProgress: 80,
    detailsUrl: "/events/details",
  },
  {
    id: 10,
    image: "/images/events/event10.jpg",
    price: "$69",
    title: "Future of Work Symposium",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user37.jpg",
      "/images/users/user38.jpg",
      "/images/users/user39.jpg",
    ],
    seatBooked: 400,
    seatProgress: 55,
    detailsUrl: "/events/details",
  },
  {
    id: 11,
    image: "/images/events/event1.jpg",
    price: "$109",
    title: "Sustainability & Green Tech Expo",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user40.jpg",
      "/images/users/user41.jpg",
      "/images/users/user42.jpg",
    ],
    seatBooked: 700,
    seatProgress: 70,
    detailsUrl: "/events/details",
  },
  {
    id: 12,
    image: "/images/events/event2.jpg",
    price: "$159",
    title: "Blockchain & Crypto Conference",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.",
    avatarImages: [
      "/images/users/user43.jpg",
      "/images/users/user44.jpg",
      "/images/users/user45.jpg",
    ],
    seatBooked: 950,
    seatProgress: 88,
    detailsUrl: "/events/details",
  },
];

const EventsGrid: React.FC = () => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const eventsPerPage = 8; // Change this to show more or fewer events per page

  const totalPages = Math.ceil(eventsData.length / eventsPerPage);
  const indexOfFirstItem = (currentPage - 1) * eventsPerPage;
  const indexOfLastItem = indexOfFirstItem + eventsPerPage;
  const currentEvents = eventsData.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <>
      <Grid container columnSpacing={{ xs: 1, sm: 2, md: 2, lg: 3 }}>
        {currentEvents.map((event) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={event.id}>
            <Card
              sx={{
                boxShadow: "none",
                borderRadius: "7px",
                mb: "25px",
                padding: { xs: "18px", sm: "20px", lg: "12px", xl: "25px" },
              }}
              className="rmui-card"
            >
              <Box position="relative">
                <Link
                  href={event.detailsUrl}
                  className="border-radius"
                  style={{
                    display: "block",
                  }}
                >
                  <Image
                    src={event.image}
                    className="border-radius"
                    alt="event-image"
                    width={700}
                    height={467}
                  />
                </Link>

                <Box
                  className="text-white po-right-0"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    textAlign: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    bgcolor: "primary.main",
                    position: "absolute",
                    top: "0px",
                    width: "60px",
                    height: "60px",
                    borderRadius: "7px",
                    fontSize: "16px",
                  }}
                >
                  {event.price}
                </Box>
              </Box>

              <Box sx={{ mt: "15px" }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: "18px",
                    mb: "5px",
                    fontWeight: "700",
                  }}
                >
                  <Link
                    href={event.detailsUrl}
                    className="text-black hover-text-color"
                  >
                    {event.title}
                  </Link>
                </Typography>

                <Typography mb="15px" lineHeight="1.8">
                  {event.description}
                </Typography>

                <AvatarGroup
                  max={4}
                  sx={{
                    justifyContent: "flex-end",
                    mb: "20px",

                    "& .MuiAvatar-root": {
                      border: "2px solid #fff",
                      backgroundColor: "#f0f0f0",
                      color: "#000",
                      width: "35px",
                      height: "35px",
                    },
                    "& .MuiAvatarGroup-avatar": {
                      backgroundColor: "#605dff", // Custom background color for the total avatar
                      color: "#fff", // Custom color for the text
                      fontSize: "10px",
                    },
                  }}
                >
                  {event.avatarImages.map((src, index) => (
                    <Avatar key={index} alt={`Avatar ${index}`} src={src} />
                  ))}
                </AvatarGroup>

                <Box className="progress">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: "10px",
                    }}
                  >
                    <Typography>Seat Booked</Typography>

                    <Typography fontWeight={600} className="text-black">
                      {event.seatBooked}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: "#ecf0ff",
                      width: "100%",
                      height: "4px",
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: `primary.main`,
                        width: `${event.seatProgress}%`,
                        height: "4px",
                      }}
                    ></Box>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}

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
                  {Math.min(indexOfLastItem, eventsData.length)} of{" "}
                  {eventsData.length} Results
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

export default EventsGrid;
