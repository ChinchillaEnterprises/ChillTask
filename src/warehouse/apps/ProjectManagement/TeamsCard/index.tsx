"use client";

import React from "react";
import Image from "next/image";
import {
  Grid,
  Card,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  AvatarGroup,
  Avatar,
  Button,
} from "@mui/material";
import Link from "next/link";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

interface TeamMember {
  name: string;
  role: string;
  image: string;
}

interface TeamData {
  leader: TeamMember;
  project: string;
  teamMembers: string[];
  progress: number;
}

const teamsData: TeamData[] = [
  {
    leader: {
      name: "Ava Turner",
      role: "Team Leader",
      image: "/images/users/user11.jpg",
    },
    project: "Project Management",
    teamMembers: [
      "/images/users/user15.jpg",
      "/images/users/user16.jpg",
      "/images/users/user17.jpg",
      "/images/users/user18.jpg",
      "/images/users/user19.jpg",
    ],
    progress: 85,
  },
  {
    leader: {
      name: "Ethan Parker",
      role: "Team Leader",
      image: "/images/users/user12.jpg",
    },
    project: "eCommerce Theme",
    teamMembers: [
      "/images/users/user6.jpg",
      "/images/users/user7.jpg",
      "/images/users/user8.jpg",
    ],
    progress: 45,
  },
  {
    leader: {
      name: "Isabella Lee",
      role: "Team Leader",
      image: "/images/users/user13.jpg",
    },
    project: "Shopify Theme Dev",
    teamMembers: [
      "/images/users/user10.jpg",
      "/images/users/user11.jpg",
      "/images/users/user12.jpg",
    ],
    progress: 70,
  },
  {
    leader: {
      name: "Liam Smith",
      role: "Team Leader",
      image: "/images/users/user14.jpg",
    },
    project: "React Dashboard",
    teamMembers: [
      "/images/users/user3.jpg",
      "/images/users/user4.jpg",
      "/images/users/user5.jpg",
    ],
    progress: 55,
  },
  {
    leader: {
      name: "Olivia Johnson",
      role: "Team Leader",
      image: "/images/users/user15.jpg",
    },
    project: "Mobile App UI/UX",
    teamMembers: [
      "/images/users/user2.jpg",
      "/images/users/user3.jpg",
      "/images/users/user4.jpg",
    ],
    progress: 90,
  },
  {
    leader: {
      name: "Noah Wilson",
      role: "Team Leader",
      image: "/images/users/user16.jpg",
    },
    project: "Node.js Backend",
    teamMembers: [
      "/images/users/user7.jpg",
      "/images/users/user8.jpg",
      "/images/users/user9.jpg",
    ],
    progress: 65,
  },
  {
    leader: {
      name: "Sophia Martinez",
      role: "Team Leader",
      image: "/images/users/user17.jpg",
    },
    project: "Marketing Website",
    teamMembers: ["/images/users/user10.jpg", "/images/users/user11.jpg"],
    progress: 40,
  },
  {
    leader: {
      name: "Mason Taylor",
      role: "Team Leader",
      image: "/images/users/user18.jpg",
    },
    project: "Angular Web App",
    teamMembers: [
      "/images/users/user1.jpg",
      "/images/users/user2.jpg",
      "/images/users/user3.jpg",
    ],
    progress: 80,
  },
  {
    leader: {
      name: "Emma Brown",
      role: "Team Leader",
      image: "/images/users/user19.jpg",
    },
    project: "AI Chatbot",
    teamMembers: ["/images/users/user5.jpg", "/images/users/user6.jpg"],
    progress: 75,
  },
  {
    leader: {
      name: "Logan White",
      role: "Team Leader",
      image: "/images/users/user20.jpg",
    },
    project: "Finance Dashboard",
    teamMembers: [
      "/images/users/user8.jpg",
      "/images/users/user9.jpg",
      "/images/users/user10.jpg",
    ],
    progress: 50,
  },
  {
    leader: {
      name: "Harper Green",
      role: "Team Leader",
      image: "/images/users/user21.jpg",
    },
    project: "HR Management System",
    teamMembers: ["/images/users/user12.jpg", "/images/users/user13.jpg"],
    progress: 95,
  },
  {
    leader: {
      name: "Benjamin Adams",
      role: "Team Leader",
      image: "/images/users/user22.jpg",
    },
    project: "IoT Home Automation",
    teamMembers: ["/images/users/user14.jpg", "/images/users/user15.jpg"],
    progress: 60,
  },
  {
    leader: {
      name: "Evelyn Carter",
      role: "Team Leader",
      image: "/images/users/user23.jpg",
    },
    project: "Web Scraping Tool",
    teamMembers: [
      "/images/users/user16.jpg",
      "/images/users/user17.jpg",
      "/images/users/user18.jpg",
    ],
    progress: 85,
  },
  {
    leader: {
      name: "Henry Thomas",
      role: "Team Leader",
      image: "/images/users/user24.jpg",
    },
    project: "CMS Development",
    teamMembers: ["/images/users/user19.jpg", "/images/users/user20.jpg"],
    progress: 35,
  },
  {
    leader: {
      name: "Amelia Scott",
      role: "Team Leader",
      image: "/images/users/user25.jpg",
    },
    project: "Blockchain App",
    teamMembers: [
      "/images/users/user1.jpg",
      "/images/users/user3.jpg",
      "/images/users/user5.jpg",
    ],
    progress: 70,
  },
  {
    leader: {
      name: "Daniel Hall",
      role: "Team Leader",
      image: "/images/users/user26.jpg",
    },
    project: "Video Streaming Platform",
    teamMembers: ["/images/users/user7.jpg", "/images/users/user9.jpg"],
    progress: 80,
  },
  {
    leader: {
      name: "Charlotte King",
      role: "Team Leader",
      image: "/images/users/user27.jpg",
    },
    project: "Virtual Reality App",
    teamMembers: [
      "/images/users/user11.jpg",
      "/images/users/user13.jpg",
      "/images/users/user15.jpg",
    ],
    progress: 90,
  },
  {
    leader: {
      name: "Sebastian Rodriguez",
      role: "Team Leader",
      image: "/images/users/user28.jpg",
    },
    project: "Gaming Platform",
    teamMembers: ["/images/users/user17.jpg", "/images/users/user19.jpg"],
    progress: 55,
  },
  {
    leader: {
      name: "Aria Lewis",
      role: "Team Leader",
      image: "/images/users/user29.jpg",
    },
    project: "Event Management System",
    teamMembers: [
      "/images/users/user2.jpg",
      "/images/users/user4.jpg",
      "/images/users/user6.jpg",
    ],
    progress: 65,
  },
  {
    leader: {
      name: "Carter Walker",
      role: "Team Leader",
      image: "/images/users/user30.jpg",
    },
    project: "E-learning Platform",
    teamMembers: [
      "/images/users/user8.jpg",
      "/images/users/user10.jpg",
      "/images/users/user12.jpg",
    ],
    progress: 75,
  },
];

const TeamsCard: React.FC = () => {
  // Dropdown
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const teamsPerPage = 8; // Change this to how many teams you want per page

  const totalPages = Math.ceil(teamsData.length / teamsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  };

  // Get the teams for the current page
  const indexOfLastTeam = currentPage * teamsPerPage;
  const indexOfFirstTeam = indexOfLastTeam - teamsPerPage;
  const currentTeams = teamsData.slice(indexOfFirstTeam, indexOfLastTeam);

  return (
    <>
      <Grid container columnSpacing={{ xs: 1, sm: 2, md: 2, lg: 3 }}>
        {currentTeams.map((team, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 3 }} key={index}>
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
                  mb: "15px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Box>
                    <Image
                      src={team.leader.image}
                      className="rounded-circle"
                      alt={team.leader.name}
                      width={65}
                      height={65}
                    />
                  </Box>
                  <Box>
                    <Typography
                      fontWeight={500}
                      fontSize="16px"
                      className="text-black"
                    >
                      {team.leader.name}
                    </Typography>
                    <Typography fontSize="13px">{team.leader.role}</Typography>
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
                        boxShadow: "none",
                        mt: 0,
                        border: "1px solid #eee",

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

              <Box sx={{ textAlign: "center", mb: "15px" }}>
                <Typography
                  className="text-black bg-purple-100"
                  sx={{
                    fontWeight: "500",
                    display: "inline-block",
                    padding: "5px 15px",
                    borderRadius: "30px",
                  }}
                >
                  {team.project}
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center", mb: "15px" }}>
                <Typography mb="5px">Team Members</Typography>

                <AvatarGroup
                  max={4}
                  sx={{
                    justifyContent: "center",

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
                      fontSize: "13px",
                      fontWeight: "500",
                    },
                  }}
                >
                  {team.teamMembers.map((member, i) => (
                    <Avatar key={i} src={member} />
                  ))}
                </AvatarGroup>
              </Box>

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: "8px",
                  }}
                >
                  <Typography sx={{ fontWeight: "500" }}>Progress</Typography>

                  <Typography sx={{ fontWeight: "500" }}>
                    {team.progress}%
                  </Typography>
                </Box>

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
                      width: `${team.progress}%`,
                      height: "4px",
                      borderRadius: "30px",
                    }}
                  ></Box>
                </Box>
              </Box>

              <Box sx={{ mt: "30px" }}>
                <Link href="#">
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{
                      display: "block",
                      width: "100%",
                      textTransform: "capitalize",
                      fontWeight: "500",
                      borderRadius: "7px",
                      padding: "7px 15px",
                      fontSize: "14px",
                    }}
                  >
                    View Details
                  </Button>
                </Link>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      <Box
        className="bg-white"
        sx={{
          p: { xs: "20px", md: "25px" },
          display: { sm: "flex" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          mb: "25px",
          borderRadius: "7px",
        }}
      >
        <Typography sx={{ fontSize: { xs: "13px", md: "14px" } }}>
          Showing {Math.min(indexOfLastTeam, teamsData.length)} of{" "}
          {teamsData.length} results
        </Typography>

        <Box
          sx={{
            mt: { xs: "10px", sm: "0" },
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Button
            className="border text-black"
            disabled={currentPage === 1}
            onClick={handlePreviousPage}
            sx={{
              minWidth: "auto",
              width: "30px",
              height: "30px",
              padding: "0",
              textAlign: "center",
              borderRadius: "4px",
              "&:hover": {
                backgroundColor: "primary.main",
                color: "#fff !important",
              },
            }}
          >
            <ChevronLeftIcon />
          </Button>

          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index}
              className="border text-body"
              onClick={() => setCurrentPage(index + 1)}
              sx={{
                bgcolor: currentPage === index + 1 ? "primary.main" : "inherit",
                color:
                  currentPage === index + 1 ? "white !important" : "inherit",
                minWidth: "30px",
                height: "30px",
                "&:hover": {
                  bgcolor: "primary.main",
                  color: "white !important",
                },
              }}
            >
              {index + 1}
            </Button>
          ))}

          <Button
            className="border text-black"
            disabled={currentPage === totalPages}
            onClick={handleNextPage}
            sx={{
              minWidth: "auto",
              width: "30px",
              height: "30px",
              padding: "0",
              textAlign: "center",
              borderRadius: "4px",
              "&:hover": {
                backgroundColor: "primary.main",
                color: "#fff !important",
              },
            }}
          >
            <ChevronRightIcon />
          </Button>
        </Box>
      </Box>
    </>
  );
};

export default TeamsCard;
