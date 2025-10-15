"use client";

import React from "react";
import { Grid, Card, Typography, Box } from "@mui/material";
import Image from "next/image";

interface Testimonial {
  id: number;
  name: string;
  position: string;
  image: string;
  rating: number;
  comment: string;
}

const TestimonialsStyle1: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      position: "Financial Manager",
      image: "/images/users/user6.jpg",
      rating: 5,
      comment:
        "Statistics is the science of using data to make decisions. This is relevant in almost all fields of work and there are many opportunities for employment.",
    },
    {
      id: 2,
      name: "Michael Smith",
      position: "Software Developer",
      image: "/images/users/user7.jpg",
      rating: 4.5,
      comment:
        "Statistics is the science of using data to make decisions. This is relevant in almost all fields of work and there are many opportunities for employment.",
    },
    {
      id: 3,
      name: "Emily Brown",
      position: "Web Developer",
      image: "/images/users/user8.jpg",
      rating: 5,
      comment:
        "Statistics is the science of using data to make decisions. This is relevant in almost all fields of work and there are many opportunities for employment.",
    },
  ];

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`full-${i}`} className="ri-star-fill mr-1"></i>);
    }

    if (hasHalfStar) {
      stars.push(<i key="half" className="ri-star-half-fill mr-1"></i>);
    }

    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<i key={`empty-${i}`} className="ri-star-line mr-1"></i>);
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
          p: { xs: "18px", sm: "20px", lg: "25px" },
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
          Testimonials Style - 1
        </Typography>

        <Grid
          container
          columnSpacing={{ xs: 1, sm: 2, md: 2, lg: 3 }}
          spacing={{ xs: 1, sm: 2, md: 2, lg: 3 }}
        >
          {testimonials.map((testimonial) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 4 }}
              key={testimonial.id}
            >
              <Box
                className="testimonial-item bg-gray border-radius"
                sx={{
                  mb: "25px",
                  padding: { xs: "20px", sm: "25px" },
                }}
              >
                <Box mb="10px">
                  <Image
                    src={testimonial.image}
                    width={100}
                    height={100}
                    alt="user-image"
                    className="rounded-circle"
                  />
                </Box>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "700",
                    fontSize: "18px",
                    marginBottom: "6px",
                  }}
                >
                  {testimonial.name}
                </Typography>

                <Typography component="span">{testimonial.position}</Typography>

                <Box
                  className="ratings"
                  sx={{
                    lineHeight: "1",
                    color: "#fe7a36",
                    fontSize: "16px",
                    my: "15px",
                  }}
                >
                  {renderStars(testimonial.rating)}
                </Box>

                <Typography sx={{ lineHeight: "1.8" }}>
                  "{testimonial.comment}"
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </>
  );
};

export default TestimonialsStyle1;
