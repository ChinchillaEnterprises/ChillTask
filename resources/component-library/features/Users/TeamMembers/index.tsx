"use client";

import * as React from "react";
import {
  Grid,
  Card,
  Box,
  Button,
  Menu,
  IconButton,
  MenuItem,
  Typography,
} from "@mui/material";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Image from "next/image";

interface SocialLink {
  id: string;
  icon: string;
  iconBg: string;
  url: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  joinedDate: string;
  email: string;
  phone: string;
  location: string;
  image: string;
  socialLinks: SocialLink[];
}

const teamMembersData: TeamMember[] = [
  {
    id: 1,
    name: "Ava Turner",
    role: "Business Analyst",
    joinedDate: "01 Jan 2024",
    email: "turner@trezo.com",
    phone: "+1 555-445-4455",
    location: "Washington D.C",
    image: "/images/users/user11.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 2,
    name: "Ethan Parker",
    role: "Project Manager",
    joinedDate: "10 Jan 2024",
    email: "parker@trezo.com",
    phone: "+1 555-445-7788",
    location: "San Diego",
    image: "/images/users/user12.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 3,
    name: "Isabella Lee",
    role: "Team Leader",
    joinedDate: "20 Jan 2024",
    email: "lee@trezo.com",
    phone: "+1 555-333-2288",
    location: "Los Angeles",
    image: "/images/users/user13.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 4,
    name: "Liam Johnson",
    role: "Software Engineer",
    joinedDate: "05 Feb 2024",
    email: "johnson@trezo.com",
    phone: "+1 555-567-8901",
    location: "New York",
    image: "/images/users/user14.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 5,
    name: "Olivia Martinez",
    role: "UX Designer",
    joinedDate: "15 Feb 2024",
    email: "martinez@trezo.com",
    phone: "+1 555-222-3344",
    location: "San Francisco",
    image: "/images/users/user15.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 6,
    name: "Noah Smith",
    role: "Data Scientist",
    joinedDate: "28 Feb 2024",
    email: "smith@trezo.com",
    phone: "+1 555-789-6543",
    location: "Chicago",
    image: "/images/users/user16.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 7,
    name: "Emma Davis",
    role: "HR Manager",
    joinedDate: "10 Mar 2024",
    email: "davis@trezo.com",
    phone: "+1 555-321-6789",
    location: "Seattle",
    image: "/images/users/user17.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 8,
    name: "Mason Wilson",
    role: "Marketing Specialist",
    joinedDate: "18 Mar 2024",
    email: "wilson@trezo.com",
    phone: "+1 555-654-1234",
    location: "Miami",
    image: "/images/users/user18.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 9,
    name: "Ethan Parker",
    role: "Project Manager",
    joinedDate: "10 Jan 2024",
    email: "parker@trezo.com",
    phone: "+1 555-445-7788",
    location: "San Diego",
    image: "/images/users/user12.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 10,
    name: "Isabella Lee",
    role: "Team Leader",
    joinedDate: "20 Jan 2024",
    email: "lee@trezo.com",
    phone: "+1 555-333-2288",
    location: "Los Angeles",
    image: "/images/users/user13.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 11,
    name: "Liam Johnson",
    role: "Software Engineer",
    joinedDate: "05 Feb 2024",
    email: "johnson@trezo.com",
    phone: "+1 555-567-8901",
    location: "New York",
    image: "/images/users/user14.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
  {
    id: 12,
    name: "Olivia Martinez",
    role: "UX Designer",
    joinedDate: "15 Feb 2024",
    email: "martinez@trezo.com",
    phone: "+1 555-222-3344",
    location: "San Francisco",
    image: "/images/users/user15.jpg",
    socialLinks: [
      {
        id: "1",
        icon: "ri-linkedin-fill",
        iconBg: "#007ab9",
        url: "https://linkedin.com/",
      },
      {
        id: "2",
        icon: "ri-twitter-fill",
        iconBg: "#03a9f4",
        url: "https://twitter.com/",
      },
      {
        id: "3",
        icon: "ri-facebook-fill",
        iconBg: "#3a559f",
        url: "https://facebook.com/",
      },
      {
        id: "4",
        icon: "ri-github-fill",
        iconBg: "#000",
        url: "https://github.com/",
      },
    ],
  },
];

const TeamMembers: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 8; // Number of items to display per page

  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Filter team members based on search query
  const filteredTeamMembers = teamMembersData.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTeamMembers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredTeamMembers.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

          <Box>
            <Link href="/users/add-user">
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
                <AddIcon sx={{ position: "relative", top: "-1px" }} /> Add New
                Member
              </Button>
            </Link>
          </Box>
        </Box>
      </Card>

      <Grid container columnSpacing={{ xs: 1, sm: 2, md: 2, lg: 3 }}>
        {currentItems.map((member) => (
          <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 3 }} key={member.id}>
            <Card
              sx={{
                boxShadow: "none",
                borderRadius: "7px",
                padding: { xs: "18px", sm: "20px", lg: "25px" },
                mb: "25px",
              }}
              className="rmui-card team-member-card"
            >
              {/* Card content for each team member */}
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
                      src={member.image}
                      alt="user-image"
                      width={65}
                      height={65}
                      style={{
                        borderRadius: "100px",
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      fontSize="16px"
                      className="text-black"
                    >
                      {member.name}
                    </Typography>

                    <Typography>{member.role}</Typography>
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

              <Box mb="15px">
                <Box className="text-black" mt="10px">
                  Joined Date:
                  <span className="text-body ml-5">{member.joinedDate}</span>
                </Box>

                <Box className="text-black" mt="10px">
                  Email Address:
                  <span className="text-body ml-5">{member.email}</span>
                </Box>

                <Box className="text-black" mt="10px">
                  Phone Number:
                  <span className="text-body ml-5">{member.phone}</span>
                </Box>

                <Box className="text-black" mt="10px">
                  Location:
                  <span className="text-body ml-5">{member.location}</span>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {member.socialLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    style={{
                      display: "inline-block",
                      textAlign: "center",
                      borderRadius: "100%",
                      width: "28px",
                      height: "28px",
                      lineHeight: "28px",
                      color: "#fff",
                      background: `${link.iconBg}`,
                    }}
                  >
                    <i className={link.icon}></i>
                  </a>
                ))}
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
                  {Math.min(indexOfLastItem, filteredTeamMembers.length)} of{" "}
                  {filteredTeamMembers.length} Results
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

export default TeamMembers;
