-- Add migration script here
ALTER TABLE items
ADD COLUMN grade TEXT
CHECK (grade IN (
    'Consumer Grade',
    'Industrial Grade',
    'Mil-Spec',
    'Restricted',
    'Classified',
    'Covert',
    'Contraband'
));

CREATE INDEX idx_items_grade ON items (grade);