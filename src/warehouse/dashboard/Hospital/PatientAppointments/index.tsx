"use client";

import * as React from "react";
import Image from "next/image";
import {
  Card,
  Box,
  Typography,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TablePagination,
  TableRow,
  Paper,
  IconButton,
  TableHead,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import styles from "../PatientAppointments/PatientAppointments.module.css";
import DateTimePickerDemo from "./DateTimePickerDemo";

interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number
  ) => void;
}

function TablePaginationActions(props: TablePaginationActionsProps) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleBackButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page + 1);
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
        display: "flex",
        gap: "10px",
        padding: "0 20px",
      }}
    >
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
        sx={{
          borderRadius: "4px",
          padding: "6px",
        }}
        className="border"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowRight />
        ) : (
          <KeyboardArrowLeft />
        )}
      </IconButton>

      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
        sx={{
          borderRadius: "4px",
          padding: "6px",
        }}
        className="border"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowLeft />
        ) : (
          <KeyboardArrowRight />
        )}
      </IconButton>
    </Box>
  );
}

function createData(
  id: any,
  patientName: string,
  date: string,
  time: string,
  doctorImg: string,
  doctorName: string,
  department: string,
  status: string
) {
  return {
    id,
    patientName,
    date,
    time,
    doctorImg,
    doctorName,
    department,
    status,
  };
}

const rows = [
  createData(
    "1",
    "John Doe",
    "Sep 12, 2024",
    "10:30 AM",
    "/images/users/user11.jpg",
    "Dr. Sarah",
    "Cardiology",
    "confirmed"
  ),
  createData(
    "2",
    "Jane Smith",
    "Sep 11, 2024",
    "11:00 AM",
    "/images/users/user32.jpg",
    "Dr. Mark",
    "Pediatrics",
    "rescheduled"
  ),
  createData(
    "3",
    "Robert Clark",
    "Sep 10, 2024",
    "1:00 PM",
    "/images/users/user33.jpg",
    "Dr. Emily",
    "Orthopedics",
    "cancelled"
  ),
  createData(
    "4",
    "Linda Green",
    "Sep 09, 2024",
    "9:30 AM",
    "/images/users/user34.jpg",
    "Dr. Adam",
    "Dermatology",
    "confirmed"
  ),
  createData(
    "5",
    "Michael White",
    "Sep 08, 2024",
    "2:00 PM",
    "/images/users/user35.jpg",
    "Dr. Rebecca",
    "Surgery",
    "pending"
  ),
  createData(
    "6",
    "Michael White",
    "Sep 08, 2024",
    "2:00 PM",
    "/images/users/user35.jpg",
    "Dr. Rebecca",
    "Surgery",
    "pending"
  ),
  createData(
    "7",
    "Linda Green",
    "Sep 09, 2024",
    "9:30 AM",
    "/images/users/user34.jpg",
    "Dr. Adam",
    "Dermatology",
    "confirmed"
  ),
  createData(
    "8",
    "Robert Clark",
    "Sep 10, 2024",
    "1:00 PM",
    "/images/users/user33.jpg",
    "Dr. Emily",
    "Orthopedics",
    "cancelled"
  ),
  createData(
    "9",
    "Jane Smith",
    "Sep 11, 2024",
    "11:00 AM",
    "/images/users/user32.jpg",
    "Dr. Mark",
    "Pediatrics",
    "rescheduled"
  ),
  createData(
    "10",
    "John Doe",
    "Sep 12, 2024",
    "10:30 AM",
    "/images/users/user11.jpg",
    "Dr. Sarah",
    "Cardiology",
    "confirmed"
  ),
].sort((b, a) => (a.id < b.id ? -1 : 1));

const PatientAppointments: React.FC = () => {
  // Dropdown
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Table
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
            display: {sm: 'flex'},
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
            Patient Appointments
          </Typography>

          <Box sx={{ mt: {xs: '10px', sm: '0'} }}>
            <DateTimePickerDemo />
          </Box>
        </Box>

        {/* Table */}
        <TableContainer
          component={Paper}
          sx={{
            boxShadow: "none",
            borderRadius: "0",
          }}
          className="rmui-table"
        >
          <Table sx={{ minWidth: 700 }} className={styles.thTable}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    padding: "0 14px 7px",
                    fontSize: "12px",
                  }}
                  className="border-bottom"
                >
                  Patient Name
                </TableCell>

                <TableCell
                  sx={{
                    padding: "0 14px 7px",
                    fontSize: "12px",
                    textAlign: "end",
                  }}
                  className="border-bottom"
                >
                  Date
                </TableCell>

                <TableCell
                  sx={{
                    padding: "0 14px 7px",
                    fontSize: "12px",
                    textAlign: "end",
                  }}
                  className="border-bottom"
                >
                  Time
                </TableCell>

                <TableCell
                  sx={{
                    padding: "0 14px 7px",
                    fontSize: "12px",
                  }}
                  className="border-bottom"
                >
                  Assigned
                </TableCell>

                <TableCell
                  sx={{
                    padding: "0 14px 7px",
                    fontSize: "12px",
                    textAlign: "end",
                  }}
                  className="border-bottom"
                >
                  Department
                </TableCell>

                <TableCell
                  sx={{
                    padding: "0 14px 7px",
                    fontSize: "12px",
                    textAlign: "end",
                  }}
                  className="border-bottom"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {(rowsPerPage > 0
                ? rows.slice(
                    page * rowsPerPage,
                    page * rowsPerPage + rowsPerPage
                  )
                : rows
              ).map((row) => (
                <TableRow key={row.id}>
                  <TableCell
                    sx={{
                      padding: "7px 14px",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                    className="text-black border-bottom"
                  >
                    {row.patientName}
                  </TableCell>

                  <TableCell
                    sx={{
                      padding: "7px 14px",
                      fontSize: "14px",
                      textAlign: "end",
                      fontWeight: "500",
                    }}
                    className="border-bottom"
                  >
                    {row.date}
                  </TableCell>

                  <TableCell
                    sx={{
                      padding: "7px 14px",
                      fontSize: "14px",
                      textAlign: "end",
                      fontWeight: "500",
                    }}
                    className="border-bottom"
                  >
                    {row.time}
                  </TableCell>

                  <TableCell
                    sx={{
                      padding: "7px 14px",
                      fontSize: "14px",
                    }}
                    className="text-black border-bottom"
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Image
                        src={row.doctorImg}
                        alt="Product"
                        width={34}
                        height={34}
                        style={{ borderRadius: "100px" }}
                      />

                      <Typography
                        sx={{
                          fontWeight: "500",
                        }}
                      >
                        {row.doctorName}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell
                    sx={{
                      padding: "7px 14px",
                      fontSize: "14px",
                      textAlign: "end",
                      fontWeight: "500",
                    }}
                    className="border-bottom"
                  >
                    {row.department}
                  </TableCell>

                  <TableCell
                    sx={{
                      padding: "7px 14px",
                      fontSize: "14px",
                      textAlign: "end",
                      fontWeight: "500",
                    }}
                    className="text-black border-bottom"
                  >
                    <Box className={`trezo-badge ${row.status}`} sx={{ textTransform: 'capitalize' }}>{row.status}</Box>
                  </TableCell>
                </TableRow>
              ))}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell className="border-bottom" colSpan={6} />
                </TableRow>
              )}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, { label: "All", value: -1 }]}
                  colSpan={6}
                  count={rows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  slotProps={{
                    select: {
                      inputProps: {
                        "aria-label": "rows per page",
                      },
                      native: true,
                    },
                  }}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  ActionsComponent={TablePaginationActions}
                  sx={{
                    border: "none",
                  }}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
};

export default PatientAppointments;
