-- Complete the database-backed reference catalog. No profile data is created.
alter table cities add column is_coastal boolean not null default false;
update cities set is_coastal = true where plate in (1, 7, 8, 9, 10, 16, 17, 22, 28, 31, 33, 34, 35, 37, 39, 41, 48, 52, 53, 54, 55, 57, 59, 61, 67, 74, 77, 81);
