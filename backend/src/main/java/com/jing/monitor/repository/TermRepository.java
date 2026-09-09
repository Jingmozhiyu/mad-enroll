package com.jing.monitor.repository;

import com.jing.monitor.model.AcademicTerm;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TermRepository extends JpaRepository<AcademicTerm, String> {
    java.util.List<AcademicTerm> findAllByStatusNotOrderByCodeDesc(com.jing.monitor.model.TermStatus status);
    // Insert only: a concurrent duplicate create must never merge over an existing term's state.
    @Modifying
    @Query(value = "insert into terms (term_code, label, status, is_default) values (:code, :label, 'UPCOMING', false)", nativeQuery = true)
    void insertUpcoming(@Param("code") String code, @Param("label") String label);

    // Subscription transactions share this lock until the enclosing transaction ends.
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select t from AcademicTerm t where t.code = :code")
    Optional<AcademicTerm> findByCodeForShare(@Param("code") String code);

    // State changes exclude subscription transactions and other state changes.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from AcademicTerm t where t.code = :code")
    Optional<AcademicTerm> findByCodeForUpdate(@Param("code") String code);
}
