DO 
DECLARE
    row_count INT;
    tbl TEXT;
    tables TEXT[] := ARRAY['CommercialMission', 'CommercialMissionEvent', 'MissionScore', 'MissionAgentTrace', 'NextBestActionRecommendation'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('SELECT count(*) FROM %I', tbl) INTO row_count;
            IF row_count > 0 THEN
                RAISE EXCEPTION 'Table % contains % rows. Aborting migration to prevent data loss.', tbl, row_count;
            END IF;
        END IF;
    END LOOP;
END ;
DROP TABLE IF EXISTS "NextBestActionRecommendation";
DROP TABLE IF EXISTS "MissionScore";
DROP TABLE IF EXISTS "MissionAgentTrace";
DROP TABLE IF EXISTS "CommercialMissionEvent";
DROP TABLE IF EXISTS "CommercialMission";
