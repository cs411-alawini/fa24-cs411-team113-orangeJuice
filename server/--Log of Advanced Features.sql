--Log of Advanced Features



-- Trigger: set_favorite_date_before_insert
-- Purpose: Automatically sets the 'Date' field to the current date if it is not provided during the insertion of a new favorite.

DELIMITER //

CREATE TRIGGER set_favorite_date_before_insert
BEFORE INSERT ON Favorites
FOR EACH ROW
BEGIN
    -- Check if the 'Date' field in the new row is NULL
    IF NEW.Date IS NULL THEN
        -- If NULL, set it to the current date using CURDATE()
        SET NEW.Date = CURDATE();
    END IF;
END//

DELIMITER ;



-- Procedure 1: AddOrUpdateFavorite
-- Purpose: Adds a new favorite for a user or updates the date if the favorite already exists.
-- Additionally, increments the popularity score of the corresponding university when a new favorite is added.

DELIMITER //

CREATE PROCEDURE AddOrUpdateFavorite (
    IN p_UserID INT,     -- Input parameter: ID of the user adding the favorite
    IN p_ChoiceID INT    -- Input parameter: ID of the choice (university) being favorited
)
BEGIN
    DECLARE v_FavoriteID INT;  -- Variable to store the FavoriteID if it exists

    -- Set the transaction isolation level to SERIALIZABLE to prevent concurrent modifications
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    -- Start a new transaction to ensure atomicity of the operations
    START TRANSACTION;

    -- Subquery to check if the favorite already exists for the given UserID and ChoiceID
    SELECT FavoriteID INTO v_FavoriteID
    FROM Favorites
    WHERE UserID = p_UserID AND ChoiceID = p_ChoiceID
    LIMIT 1;

    -- Control Structure: Determine whether to update an existing favorite or insert a new one
    IF v_FavoriteID IS NOT NULL THEN
        -- If the favorite exists, update its 'Date' to the current date
        UPDATE Favorites
        SET Date = CURDATE()
        WHERE FavoriteID = v_FavoriteID;
    ELSE
        -- If the favorite does not exist, insert a new row into Favorites
        INSERT INTO Favorites (ChoiceID, UserID)
        VALUES (p_ChoiceID, p_UserID);

        -- After inserting a new favorite, increment the PopularityScore of the corresponding university
        UPDATE University u
        JOIN Choices c ON u.InstitutionName = c.FirstChoice
        SET u.PopularityScore = u.PopularityScore + 1
        WHERE c.ChoiceID = p_ChoiceID;
    END IF;

    -- Commit the transaction to save the changes
    COMMIT;
END//

DELIMITER ;





-- Procedure 2: GetTop5Universities
-- Purpose: Retrieves the top 5 universities based on weighted factors: Quality, Research, Alumni, and Favorites.
-- Ensures that weights are non-negative and handles any SQL exceptions by rolling back the transaction.

DELIMITER //

CREATE PROCEDURE GetTop5Universities (
    IN p_quality_weight INT,   -- Input parameter: Weight assigned to the 'Quality' factor
    IN p_research_weight INT,  -- Input parameter: Weight assigned to the 'Research' factor
    IN p_alumni_weight INT     -- Input parameter: Weight assigned to the 'Alumni' factor
)
BEGIN
    -- Exit handler to catch any SQL exceptions, roll back the transaction, and raise an error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction failed and was rolled back.';
    END;

    -- Set the transaction isolation level to READ COMMITTED to allow concurrent transactions while preventing dirty reads
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    -- Start a new transaction
    START TRANSACTION;

    -- Control Structure: Validate that all input weights are non-negative
    IF p_quality_weight < 0 OR p_research_weight < 0 OR p_alumni_weight < 0 THEN
        -- If any weight is negative, raise an error and roll back the transaction
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Weights must be non-negative integers.';
    END IF;

    -- Advanced Query: Calculate the total score for each university based on the weighted factors and favorites
    SELECT u.InstitutionName,
           (u.Quality * p_quality_weight +
            u.Research * p_research_weight +
            u.Alumni * p_alumni_weight +
            IFNULL(f.FavCount, 0)) AS TotalScore
    FROM University u
    -- Left join with a subquery that counts the number of favorites per ChoiceID
    LEFT JOIN (
        SELECT ChoiceID, COUNT(*) AS FavCount
        FROM Favorites
        GROUP BY ChoiceID
    ) f ON u.id = f.ChoiceID
    -- Order the results by TotalScore in descending order to get the top scores first
    ORDER BY TotalScore DESC
    -- Limit the results to the top 5 universities
    LIMIT 5;

    -- Commit the transaction to finalize the changes (if any)
    COMMIT;
END//

DELIMITER ;

