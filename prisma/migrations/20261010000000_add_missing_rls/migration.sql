CREATE POLICY "Global Read Integration" ON "Integration" FOR SELECT USING (true);
CREATE POLICY "Global Write Integration" ON "Integration" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Global Read Plan" ON "Plan" FOR SELECT USING (true);
CREATE POLICY "Global Write Plan" ON "Plan" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Global Read Integration" ON "Integration" FOR SELECT USING (true);
CREATE POLICY "Global Write Integration" ON "Integration" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Global Read Plan" ON "Plan" FOR SELECT USING (true);
CREATE POLICY "Global Write Plan" ON "Plan" FOR ALL USING (true) WITH CHECK (true);
