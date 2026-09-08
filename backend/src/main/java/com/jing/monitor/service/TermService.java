package com.jing.monitor.service;

import com.jing.monitor.model.AcademicTerm;
import com.jing.monitor.model.TermStatus;
import com.jing.monitor.repository.TermRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TermService {
    private final TermRepository termRepository;

    @Transactional(readOnly = true)
    public void requireSearchable(String code) {
        validateCode(code);
        requireNotExpired(termRepository.findById(code)
                .orElseThrow(() -> new IllegalArgumentException("Term is not configured: " + code)));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public AcademicTerm lockTerm(String code) {
        validateCode(code);
        return termRepository.findByCodeForUpdate(code)
                .orElseThrow(() -> new IllegalArgumentException("Term is not configured: " + code));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void lockSubscribableTerm(String code) {
        requireNotExpired(lockTerm(code));
    }

    public void validateCode(String code) {
        if (code == null || !code.matches("\\d{4}")) {
            throw new IllegalArgumentException("termCode must be a 4-digit number.");
        }
    }

    private void requireNotExpired(AcademicTerm term) {
        if (term.getStatus() == TermStatus.EXPIRED) {
            throw new IllegalArgumentException("This term has expired. New subscriptions are unavailable.");
        }
    }
}
