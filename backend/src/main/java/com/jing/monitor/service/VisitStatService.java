package com.jing.monitor.service;

import com.jing.monitor.model.VisitStat;
import com.jing.monitor.repository.VisitStatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j

public class VisitStatService {

    public final VisitStatRepository visitStatRepository;

    public void visitFromPersonalWebsite(){
        VisitStat stat = new VisitStat();
        visitStatRepository.save(stat);
    }
}
