-- Partner grouping: industry (合作夥伴) tab renders members grouped by
-- group_order with a visual divider between groups. Default 1 keeps
-- core / legal_entity (and any untouched rows) in a single group, so
-- rendering stays identical for single-group categories.
alter table organization_members
  add column group_order integer not null default 1;
