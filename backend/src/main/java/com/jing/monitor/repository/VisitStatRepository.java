package com.jing.monitor.repository;

import com.jing.monitor.model.VisitStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VisitStatRepository extends JpaRepository<VisitStat, Long> {

}
