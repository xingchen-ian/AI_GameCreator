UPDATE `question_answers`
SET `status` = 'confirmed'
WHERE `status` = 'needs_review';
